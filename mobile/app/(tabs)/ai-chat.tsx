import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { ChatTurn, TriageResult } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

interface Message {
  id: string;
  type: 'question' | 'answer' | 'result' | 'user' | 'error';
  content: string;
  options?: { id: string; key: string; text: string; emoji: string }[];
  triage?: TriageResult['triage'];
}

let nextId = 1;
function uid(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    id: uid('msg'),
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

  const handleTurn = useCallback((turn: ChatTurn) => {
    if (turn.type === 'question') {
      addMessage({
        id: uid('q'),
        type: 'question',
        content: turn.question.text,
        options: turn.question.options,
      });
    } else {
      const triage = turn.triage;
      addMessage({
        id: uid('result'),
        type: 'result',
        content: `**${triage.urgency.label}** — ${triage.reason}\n\n` +
          `Recommended: ${triage.recommended_specialties.map((s) => s.specialty).join(', ')}\n\n` +
          (triage.emergency_flag ? '🚨 Emergency — seek immediate care!\n\n' : '') +
          `*${triage.disclaimer}*`,
        triage: triage,
      });
      if (triage.emergency_flag) {
        addMessage({
          id: uid('emergency'),
          type: 'question',
          content: 'Please seek emergency medical attention immediately. Do you want to find nearby doctors?',
          options: [{ id: 'yes', key: 'emergency.yes', text: 'Find Doctors', emoji: 'ambulance' }],
        });
      }
    }
  }, [addMessage]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addMessage({ id: uid('user'), type: 'user', content: msg });

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
    } catch {
      addMessage({ id: uid('error'), type: 'error', content: 'Sorry, the AI service is unavailable. Please try again later.' });
    } finally {
      setLoading(false);
    }
  }, [input, loading, answers, addMessage, handleTurn]);

  const handleOptionSelect = useCallback(async (option: { id: string; key: string; text: string }) => {
    const isCategory = option.key.startsWith('category.');
    const categoryAnswer = isCategory ? option.id : undefined;
    addMessage({ id: uid('answer'), type: 'answer', content: option.text });

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
    } catch {
      addMessage({ id: uid('error'), type: 'error', content: 'Sorry, something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [answers, loading, addMessage, handleTurn]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
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

    if (item.type === 'error') {
      return (
        <View style={styles.errorBubble}>
          <Text style={styles.errorText}>{item.content}</Text>
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
              <Pressable
                key={opt.key}
                style={({ pressed }) => [styles.optionChip, pressed && styles.pressed]}
                onPress={() => handleOptionSelect(opt)}
                disabled={loading}
              >
                <Text style={styles.optionText}>{opt.emoji} {opt.text}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {item.triage?.recommended_specialties && item.triage.recommended_specialties.length > 0 && (
          <Button
            title="Book Appointment"
            style={styles.bookBtn}
            onPress={() => router.push('/(tabs)/doctors')}
          />
        )}
      </View>
    );
  }, [loading, handleOptionSelect, router]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <Screen padded={false}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
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
        <Button
          title="Send"
          style={styles.sendBtn}
          textStyle={styles.sendBtnText}
          loading={loading}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        />
      </View>
    </Screen>
  );
}

function TypingIndicator() {
  return <Text style={styles.typing}>Typing...</Text>;
}

const styles = StyleSheet.create({
  listContent: { padding: layout.horizontalPadding, paddingBottom: spacing.sm },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%', borderWidth: 1, borderColor: colors.border },
  botText: { ...typography.body, color: colors.ink },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%' },
  userText: { ...typography.body, color: colors.white },
  answerBubble: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, maxWidth: '85%' },
  answerText: { ...typography.body, color: colors.primaryDark },
  resultBubble: { alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '90%', borderWidth: 1, borderColor: '#F1D08C' },
  resultText: { ...typography.body, color: '#7A4D08' },
  errorBubble: { alignSelf: 'flex-start', backgroundColor: colors.dangerSoft, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%', borderWidth: 1, borderColor: '#F3B8BB' },
  errorText: { ...typography.body, color: colors.danger },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  optionChip: { backgroundColor: colors.primarySoft, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#B9DDE5', minHeight: 44, justifyContent: 'center' },
  optionText: { ...typography.caption, color: colors.primaryDark },
  bookBtn: { marginTop: spacing.md },
  typing: { color: colors.inkSubtle, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },
  inputBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, maxHeight: 100, color: colors.ink },
  sendBtn: { width: 76, marginLeft: spacing.sm },
  sendBtnText: { fontSize: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
