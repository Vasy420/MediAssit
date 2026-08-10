import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';

interface QuestionOption {
  id: string;
  key: string;
  text: string;
  emoji: string;
}

interface PreConsultQuestion {
  type: 'question';
  question: { id: string; key: string; text: string; rephrased: boolean; options: QuestionOption[] };
  done: boolean;
}

interface PreConsultResult {
  type: 'result';
  preconsult_summary: Record<string, unknown>;
  done: boolean;
}

type PreConsultTurn = PreConsultQuestion | PreConsultResult;

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  options?: QuestionOption[];
}

export default function PreConsultScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const [pcId, setPcId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<{ key: string; answer: string; rephrased: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [freeText, setFreeText] = useState('');
  const [waitingForFreeText, setWaitingForFreeText] = useState(false);
  const [waitingKey, setWaitingKey] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const processTurn = useCallback(async (turn: PreConsultTurn) => {
    if (turn.type === 'question' && turn.question) {
      addMessage({ role: 'bot', text: turn.question.text, options: turn.question.options });
      const hasFreeText = turn.question.options.length === 1 && turn.question.options[0].id === 'free_text';
      if (hasFreeText) {
        setWaitingForFreeText(true);
        setWaitingKey(turn.question.key);
      }
    } else if (turn.type === 'result' && turn.preconsult_summary) {
      setDone(true);
      setSummary(turn.preconsult_summary);
      addMessage({ role: 'bot', text: 'Your pre-consultation summary has been generated and shared with your doctor.', options: [] });
    }
  }, [addMessage]);

  const startInterview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.post<PreConsultTurn & { pc_id: string }>('/api/preconsult/start', {
        appointment_id: appointmentId,
      });
      const turn = res.data as unknown as PreConsultTurn & { pc_id: string };
      if (turn.pc_id) setPcId(turn.pc_id);
      await processTurn(turn);
    } catch (e) {
      addMessage({ role: 'bot', text: 'Failed to start pre-consultation. Please try again.', options: [] });
    } finally {
      setLoading(false);
    }
  }, [appointmentId, processTurn, addMessage]);

  useState(() => {
    startInterview();
  });

  const handleOptionSelect = useCallback(async (option: QuestionOption) => {
    if (option.key === 'free_text') return;
    if (!pcId) return;

    addMessage({ role: 'user', text: option.text, options: [] });
    setLoading(true);

    const newAnswers = [...answers, { key: option.key, answer: option.key, rephrased: false }];
    setAnswers(newAnswers);

    try {
      const res = await api.post<PreConsultTurn>('/api/preconsult/answer', {
        pc_id: pcId,
        answers: [{ key: option.key, answer: option.key, rephrased: false }],
      });
      const turn = res.data as unknown as PreConsultTurn;
      await processTurn(turn);
    } catch {
      addMessage({ role: 'bot', text: 'Something went wrong. Please try again.', options: [] });
    } finally {
      setLoading(false);
    }
  }, [pcId, answers, addMessage, processTurn]);

  const handleFreeTextSubmit = useCallback(async () => {
    if (!freeText.trim() || !pcId) return;
    const text = freeText.trim();
    setFreeText('');
    setWaitingForFreeText(false);

    addMessage({ role: 'user', text, options: [] });
    setLoading(true);

    const newAnswers = [...answers, { key: waitingKey, answer: text, rephrased: false }];
    setAnswers(newAnswers);

    try {
      const res = await api.post<PreConsultTurn>('/api/preconsult/answer', {
        pc_id: pcId,
        message: text,
        answers: [{ key: waitingKey, answer: text, rephrased: false }],
      });
      const turn = res.data as unknown as PreConsultTurn;
      await processTurn(turn);
    } catch {
      addMessage({ role: 'bot', text: 'Something went wrong. Please try again.', options: [] });
    } finally {
      setLoading(false);
    }
  }, [freeText, pcId, waitingKey, answers, addMessage, processTurn]);

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((msg, i) => (
          <View key={i} style={msg.role === 'bot' ? styles.botBubble : styles.userBubble}>
            <Text style={msg.role === 'bot' ? styles.botText : styles.userText}>{msg.text}</Text>
            {msg.options && msg.options.length > 0 && !done && (
              <View style={styles.optionsRow}>
                {msg.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.optionChip}
                    onPress={() => handleOptionSelect(opt)}
                    disabled={loading}
                  >
                    {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
                    <Text style={styles.optionText}>{opt.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        {loading && <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 12 }} />}
      </ScrollView>

      {waitingForFreeText && (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={freeText}
            onChangeText={setFreeText}
            placeholder="Type your answer..."
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleFreeTextSubmit} disabled={!freeText.trim() || loading}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {done && summary && (
        <View style={styles.doneArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Appointments</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 32 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563EB', borderRadius: 12, padding: 14, marginBottom: 12, maxWidth: '85%' },
  botText: { fontSize: 15, color: '#1E293B', lineHeight: 22 },
  userText: { fontSize: 15, color: '#FFF', lineHeight: 22 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  optionChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  optionEmoji: { fontSize: 16, marginRight: 6 },
  optionText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1E293B', maxHeight: 100 },
  sendBtn: { marginLeft: 10, backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  sendBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  doneArea: { padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  backBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center' },
  backBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
