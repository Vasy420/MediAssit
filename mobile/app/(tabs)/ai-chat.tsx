import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { ChatTurn, TriageQuestion, TriageResult } from '../../src/types';

interface Message {
  id: string;
  type: 'question' | 'answer' | 'result' | 'user';
  content: string;
  options?: { id: string; key: string; text: string; emoji: string }[];
  triage?: TriageResult['triage'];
}

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    type: 'question',
    content: 'Hi! Describe what you\'re experiencing, and I\'ll help guide you to the right care.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<{ key: string; answer: string; rephrased: boolean }[]>([]);
  const flatListRef = useRef<FlatList<Message> | null>(null);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleTurn = (turn: ChatTurn) => {
    if (turn.type === 'question') {
      addMessage({
        id: turn.question.id,
        type: 'question',
        content: turn.question.text,
        options: turn.question.options,
      });
    } else {
      const triage = turn.triage;
      addMessage({
        id: 'result',
        type: 'result',
        content: `**${triage.urgency.label}** — ${triage.reason}\n\n` +
          `Recommended: ${triage.recommended_specialties.map((s) => s.specialty).join(', ')}\n\n` +
          (triage.emergency_flag ? '🚨 Emergency — seek immediate care!\n\n' : '') +
          `*${triage.disclaimer}*`,
        triage: triage,
      });
      if (triage.emergency_flag) {
        addMessage({
          id: 'emergency',
          type: 'question',
          content: 'Please seek emergency medical attention immediately. Do you want to find nearby doctors?',
          options: [{ id: 'yes', key: 'emergency.yes', text: 'Find Doctors', emoji: 'ambulance' }],
        });
      }
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addMessage({ id: Date.now().toString(), type: 'user', content: msg });

    setLoading(true);
    try {
      const res = await api.post<ChatTurn>('/api/ai/chat', {
        message: msg,
        answers,
      });
      const turn = res.data as unknown as ChatTurn;
      if (turn) {
        handleTurn(turn);
      }
    } catch (e) {
      addMessage({ id: 'error', type: 'question', content: 'Sorry, the AI service is unavailable. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (option: { id: string; key: string; text: string }) => {
    const isCategory = option.key.startsWith('category.');
    const categoryAnswer = isCategory ? option.id : undefined;
    addMessage({ id: option.key, type: 'answer', content: option.text });

    const newAnswer = { key: option.key, answer: option.key.split('.').pop() || option.id, rephrased: false };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        answers: updatedAnswers,
      };
      if (categoryAnswer && categoryAnswer !== 'not_sure') {
        payload.message = `I have a ${categoryAnswer} problem`;
      }
      const res = await api.post<ChatTurn>('/api/ai/chat', payload);
      const turn = res.data as unknown as ChatTurn;
      if (turn) {
        handleTurn(turn);
      }
    } catch (e) {
      addMessage({ id: 'error', type: 'question', content: 'Sorry, something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'user') {
      return (
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      );
    }

    if (item.type === 'answer') {
      return (
        <View style={styles.answerBubble}>
          <Text style={styles.answerText}>{item.content}</Text>
        </View>
      );
    }

    const isResult = item.type === 'result';
    return (
      <View style={isResult ? styles.resultBubble : styles.botBubble}>
        <Text style={isResult ? styles.resultText : styles.botText}>{item.content}</Text>
        {item.options && (
          <View style={styles.optionsContainer}>
            {item.options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.optionChip}
                onPress={() => handleOptionSelect(opt)}
                disabled={loading}
              >
                <Text style={styles.optionText}>{opt.emoji} {opt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.triage?.recommended_specialties && item.triage.recommended_specialties.length > 0 && (
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => router.push('/(tabs)/doctors')}
          >
            <Text style={styles.bookBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={loading ? TypingIndicator : null}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Describe your symptoms..."
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return <Text style={styles.typing}>Typing...</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  listContent: { padding: 16, paddingBottom: 8 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, maxWidth: '85%' },
  botText: { fontSize: 15, color: '#1E293B', lineHeight: 22 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563EB', borderRadius: 12, padding: 14, marginBottom: 10, maxWidth: '85%' },
  userText: { fontSize: 15, color: '#FFF', lineHeight: 22 },
  answerBubble: { alignSelf: 'flex-end', backgroundColor: '#DBEAFE', borderRadius: 12, padding: 10, marginBottom: 10, maxWidth: '85%' },
  answerText: { fontSize: 14, color: '#1E40AF' },
  resultBubble: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 10, maxWidth: '90%', borderWidth: 1, borderColor: '#FCD34D' },
  resultText: { fontSize: 15, color: '#92400E', lineHeight: 22 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  optionChip: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  optionText: { fontSize: 13, color: '#3730A3' },
  bookBtn: { backgroundColor: '#2563EB', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 },
  bookBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  typing: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  inputBar: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E2E8F0', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 12, marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: '#94A3B8' },
  sendBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
