import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { ChatTurn, TriageResult } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing } from '../../src/ui/theme';
import {
  speechRecognitionAvailable,
  requestMicPermission,
  startListening,
  stopListening,
  abortListening,
  speak,
  stopSpeaking,
} from '../../src/services/voice';

interface Message {
  id: string;
  type: 'question' | 'answer' | 'result' | 'user' | 'error';
  content: string;
  rephrased?: boolean;
  options?: { id: string; key: string; text: string; emoji: string }[];
  triage?: TriageResult['triage'];
}

let nextId = 1;
function uid(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export default function AIChatScreen() {
  const router = useRouter();
  const [simple, setSimple] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: uid('msg'),
    type: 'question',
    content: 'Hi! Describe what you\'re experiencing, and I\'ll help guide you to the right care.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<{ key: string; answer: string; rephrased: boolean }[]>([]);
  const [listening, setListening] = useState(false);
  const voiceAvailable = speechRecognitionAvailable();
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
        rephrased: turn.question.rephrased,
        options: turn.question.options,
      });
    } else {
      const triage = turn.triage;
      addMessage({
        id: uid('result'),
        type: 'result',
        content: '',
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
        simple,
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
  }, [input, loading, answers, simple, addMessage, handleTurn]);

  const handleOptionSelect = useCallback(async (option: { id: string; key: string; text: string }, rephrased: boolean) => {
    const isCategory = option.key.startsWith('category.') && option.key !== 'category_fallback.';
    const categoryAnswer = isCategory ? option.id : undefined;
    addMessage({ id: uid('answer'), type: 'answer', content: option.text });

    const newAnswer = { key: option.key.split('.')[0], answer: option.id, rephrased };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        answers: updatedAnswers,
        simple,
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
  }, [answers, loading, simple, addMessage, handleTurn]);

  const handleVoiceToggle = useCallback(async () => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Microphone required', 'Voice input needs microphone permission.');
      return;
    }
    setListening(true);
    startListening(
      (text) => {
        setListening(false);
        setInput(text);
        void handleSend(text);
      },
      (partial) => setInput(partial),
    );
  }, [listening, handleSend]);

  const handleSpeakBot = useCallback((text?: string) => {
    if (!text) return;
    if (speechRecognitionAvailable()) stopListening();
    speak(text);
  }, []);

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
    const triage = item.triage;
    const urgencyEmoji: Record<string, string> = { red: '🚨', orange: '⚠️', yellow: '🟡', green: '🟢' };
    return (
      <View style={isResult ? styles.resultBubble : styles.botBubble}>
        {!!item.content && (
          <View style={styles.botTextRow}>
            <Text style={isResult ? styles.resultQuestion : styles.botText}>{item.content}</Text>
            <Pressable
              onPress={() => handleSpeakBot(item.content)}
              accessibilityRole="button"
              accessibilityLabel="Read aloud"
              style={({ pressed }) => [styles.speakBtn, pressed && styles.pressed]}
            >
              <Ionicons name="volume-medium" size={16} color={colors.primaryDark} />
            </Pressable>
          </View>
        )}
        {triage && (
          <View style={styles.resultBlock}>
            <Text style={[styles.resultUrgency, triage.urgency.level === 'red' && styles.resultUrgencyRed]}>
              {urgencyEmoji[triage.urgency.level] ?? ''} {triage.urgency.label}
            </Text>
            <Text style={styles.resultReason}>{triage.reason}</Text>
            {triage.emergency_flag && (
              <Text style={styles.resultEmergency}>🚨 Emergency — seek immediate care!</Text>
            )}
            <Text style={styles.resultMeta}>
              Recommended: {triage.recommended_specialties.map((s) => s.specialty).join(', ')}
            </Text>
            <Text style={styles.resultDisclaimer}>{triage.disclaimer}</Text>
          </View>
        )}
        {item.options && (
          <View style={styles.optionsContainer}>
            {item.options.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [simple ? styles.optionChipSimple : styles.optionChip, pressed && styles.pressed]}
                onPress={() => handleOptionSelect(opt, item.rephrased === true)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={`${opt.emoji} ${opt.text}`}
              >
                {simple ? (
                  <>
                    <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                    <Text style={styles.optionTextSimple}>{opt.text}</Text>
                  </>
                ) : (
                  <Text style={styles.optionText}>{opt.emoji} {opt.text}</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
        {triage?.recommended_specialties && triage.recommended_specialties.length > 0 && (
          <Button
            title="Book Appointment"
            style={styles.bookBtn}
            onPress={() => router.push('/(tabs)/doctors')}
          />
        )}
      </View>
    );
  }, [simple, loading, handleOptionSelect, router, handleSpeakBot]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const SimpleToggle = (
    <Pressable
      style={[styles.simpleToggle, simple && styles.simpleToggleOn]}
      onPress={() => setSimple((s) => !s)}
      accessibilityRole="switch"
      accessibilityState={{ checked: simple }}
      accessibilityLabel="Simple words mode"
    >
      <Text style={[styles.simpleToggleText, simple && styles.simpleToggleTextOn]}>
        {simple ? '🟢 Simple words: ON' : '⚪ Simple words: OFF'}
      </Text>
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={SimpleToggle}
        ListFooterComponent={loading ? TypingIndicator : null}
      />
      <View style={styles.inputBar}>
        {voiceAvailable && (
          <Pressable
            onPress={() => void handleVoiceToggle()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop voice input' : 'Voice input'}
            style={({ pressed }) => [
              styles.micBtn,
              listening && styles.micBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={22} color={listening ? colors.danger : colors.primaryDark} />
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          placeholder={listening ? 'Listening...' : 'Describe your symptoms...'}
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
  simpleToggle: { alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  simpleToggleOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  simpleToggleText: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.inkSubtle },
  simpleToggleTextOn: { color: colors.primaryDark },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%', borderWidth: 1, borderColor: colors.border },
  botTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  botText: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  speakBtn: { width: 30, height: 30, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%' },
  userText: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.white },
  answerBubble: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, maxWidth: '85%' },
  answerText: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.primaryDark },
  resultBubble: { alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '90%', borderWidth: 1, borderColor: '#F1D08C' },
  resultQuestion: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#7A4D08' },
  resultBlock: { marginTop: spacing.md, gap: spacing.sm },
  resultUrgency: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.warning },
  resultUrgencyRed: { color: colors.danger },
  resultReason: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: '#7A4D08' },
  resultEmergency: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: colors.danger },
  resultMeta: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#7A4D08' },
  resultDisclaimer: { fontSize: 12, lineHeight: 17, fontWeight: '400', fontStyle: 'italic', color: '#A8854A' },
  errorBubble: { alignSelf: 'flex-start', backgroundColor: colors.dangerSoft, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%', borderWidth: 1, borderColor: '#F3B8BB' },
  errorText: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.danger },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  optionChip: { backgroundColor: colors.primarySoft, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#B9DDE5', minHeight: 48, justifyContent: 'center' },
  optionText: { fontSize: 15, lineHeight: 20, fontWeight: '500', color: colors.primaryDark },
  optionChipSimple: { backgroundColor: colors.primarySoft, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#B9DDE5', minHeight: 68, minWidth: 92, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 28, lineHeight: 32 },
  optionTextSimple: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
  bookBtn: { marginTop: spacing.md },
  typing: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: colors.inkSubtle, textAlign: 'center', paddingVertical: spacing.md },
  inputBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, alignItems: 'flex-end' },
  micBtn: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  micBtnActive: { backgroundColor: colors.dangerSoft },
  input: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, maxHeight: 100, color: colors.ink },
  sendBtn: { width: 76, marginLeft: spacing.sm },
  sendBtnText: { fontSize: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
