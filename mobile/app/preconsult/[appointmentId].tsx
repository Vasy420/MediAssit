import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

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

function fakeQuestion(index: number): PreConsultQuestion {
  const questions = [
    { key: 'chief_complaint', text: 'What is your main reason for this visit?', options: [{ id: 'symptoms', key: 'chief_complaint.symptoms', text: 'I have symptoms', emoji: '' }, { id: 'checkup', key: 'chief_complaint.checkup', text: 'Routine checkup', emoji: '' }] },
    { key: 'severity', text: 'How would you describe the severity?', options: [{ id: 'mild', key: 'severity.mild', text: 'Mild', emoji: '' }, { id: 'moderate', key: 'severity.moderate', text: 'Moderate', emoji: '' }, { id: 'severe', key: 'severity.severe', text: 'Severe', emoji: '' }] },
    { key: 'duration', text: 'How long has this been happening?', options: [{ id: 'today', key: 'duration.today', text: 'Since today', emoji: '' }, { id: 'week', key: 'duration.week', text: 'A few days', emoji: '' }, { id: 'longer', key: 'duration.longer', text: 'More than a week', emoji: '' }] },
  ];
  const question = questions[Math.min(index, questions.length - 1)];
  return { type: 'question', question: { id: `fake-${question.key}`, key: question.key, text: question.text, rephrased: false, options: question.options }, done: false };
}

function fakeResult(): PreConsultResult {
  return {
    type: 'result',
    preconsult_summary: { chief_complaint: 'Demo appointment concern', symptoms: ['Demo symptom'], medications: [], allergies: [], medical_history: 'Fake test data', triage_context: { urgency: 'green' } },
    done: true,
  };
}

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  options?: QuestionOption[];
}

export default function PreConsultScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const isFake = appointmentId.startsWith('FAKE-');
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
      if (isFake) {
        setPcId('FAKE-PC-001');
        await processTurn(fakeQuestion(0));
        return;
      }
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
  }, [appointmentId, isFake, processTurn, addMessage]);

  useEffect(() => {
    void startInterview();
  }, [startInterview]);

  const handleOptionSelect = useCallback(async (option: QuestionOption) => {
    if (option.key === 'free_text') return;
    if (!pcId) return;

    addMessage({ role: 'user', text: option.text, options: [] });
    setLoading(true);

    const newAnswers = [...answers, { key: option.key, answer: option.key, rephrased: false }];
    setAnswers(newAnswers);

    try {
      if (isFake) {
        await processTurn(newAnswers.length >= 3 ? fakeResult() : fakeQuestion(newAnswers.length));
        return;
      }
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
  }, [pcId, answers, isFake, addMessage, processTurn]);

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
      if (isFake) {
        await processTurn(newAnswers.length >= 3 ? fakeResult() : fakeQuestion(newAnswers.length));
        return;
      }
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
  }, [freeText, pcId, waitingKey, answers, isFake, addMessage, processTurn]);

  return (
    <Screen padded={false}>
      <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((msg, i) => (
          <View key={i} style={msg.role === 'bot' ? styles.botBubble : styles.userBubble}>
            <Text style={msg.role === 'bot' ? styles.botText : styles.userText}>{msg.text}</Text>
            {msg.options && msg.options.length > 0 && !done && (
              <View style={styles.optionsRow}>
                {msg.options.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [styles.optionChip, pressed && styles.pressed]}
                    onPress={() => handleOptionSelect(opt)}
                    disabled={loading}
                  >
                    {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
                    <Text style={styles.optionText}>{opt.text}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />}
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
          <Button title="Send" style={styles.sendBtn} onPress={handleFreeTextSubmit} disabled={!freeText.trim() || loading} loading={loading} />
        </View>
      )}

      {done && summary && (
        <View style={styles.doneArea}>
          <Button title="Back to Appointments" style={styles.backBtn} onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chatArea: { flex: 1 },
  chatContent: { padding: layout.horizontalPadding, paddingBottom: spacing.xxxl },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%' },
  botText: { ...typography.body, color: colors.ink },
  userText: { ...typography.body, color: colors.white },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  optionChip: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  optionEmoji: { fontSize: 16, marginRight: spacing.sm },
  optionText: { ...typography.caption, color: colors.ink },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  textInput: { flex: 1, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, color: colors.ink, maxHeight: 100, backgroundColor: colors.surface },
  sendBtn: { marginLeft: spacing.sm, width: 78 },
  doneArea: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  backBtn: { width: '100%' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
