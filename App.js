import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ───────────────────────────────────────────
// ピクセルアート風の定数
// ───────────────────────────────────────────
const COLORS = {
  bg: '#0a0a1a',
  panel: '#12122a',
  border: '#3a3a6a',
  accent: '#ffdd00',
  accentDim: '#a08800',
  red: '#ff4444',
  green: '#44ff88',
  blue: '#44aaff',
  text: '#e0e0ff',
  textDim: '#6060a0',
  high: '#ff4444',
  mid: '#ffaa00',
  low: '#44aaff',
};

const PRIORITY_LABELS = { high: '★ 高', mid: '◆ 中', low: '▲ 低' };
const PRIORITY_ORDER = { high: 0, mid: 1, low: 2 };
const PRIORITY_COLORS = { high: COLORS.high, mid: COLORS.mid, low: COLORS.low };

// ───────────────────────────────────────────
// ピクセルアートキャラクター（マスコット）
// ───────────────────────────────────────────
function PixelMascot({ size = 1, talking = false, cleared = false }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        Animated.timing(blinkAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ])
    );
    blink.start();

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6 * size, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bounce.start();

    return () => { blink.stop(); bounce.stop(); };
  }, []);

  const px = (n) => n * 8 * size;
  const bodyColor = cleared ? COLORS.green : '#ff9944';

  const Block = ({ x, y, w = 1, h = 1, color }) => (
    <View style={{
      position: 'absolute',
      left: px(x), top: px(y),
      width: px(w), height: px(h),
      backgroundColor: color,
    }} />
  );

  return (
    <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
      <View style={{ width: px(10), height: px(12) }}>
        {/* 頭 */}
        <Block x={1} y={0} w={8} h={1} color={bodyColor} />
        <Block x={0} y={1} w={10} h={6} color={bodyColor} />
        <Block x={1} y={7} w={8} h={1} color={bodyColor} />
        {/* 目（まばたき） */}
        <Animated.View style={{ opacity: blinkAnim }}>
          <Block x={2} y={2} w={2} h={2} color={COLORS.bg} />
          <Block x={6} y={2} w={2} h={2} color={COLORS.bg} />
        </Animated.View>
        {/* 口 */}
        {talking ? (
          <>
            <Block x={3} y={5} w={4} h={1} color={COLORS.bg} />
            <Block x={2} y={5} w={1} h={2} color={COLORS.bg} />
            <Block x={7} y={5} w={1} h={2} color={COLORS.bg} />
            <Block x={3} y={6} w={4} h={1} color={COLORS.bg} />
          </>
        ) : cleared ? (
          <>
            <Block x={2} y={5} w={1} h={1} color={COLORS.bg} />
            <Block x={3} y={6} w={4} h={1} color={COLORS.bg} />
            <Block x={7} y={5} w={1} h={1} color={COLORS.bg} />
          </>
        ) : (
          <Block x={3} y={5} w={4} h={1} color={COLORS.bg} />
        )}
        {/* 体 */}
        <Block x={2} y={8} w={6} h={3} color={bodyColor} />
        {/* 腕 */}
        <Block x={0} y={8} w={2} h={2} color={bodyColor} />
        <Block x={8} y={8} w={2} h={2} color={bodyColor} />
        {/* 足 */}
        <Block x={2} y={11} w={2} h={1} color={bodyColor} />
        <Block x={6} y={11} w={2} h={1} color={bodyColor} />
      </View>
    </Animated.View>
  );
}

// ───────────────────────────────────────────
// ミッションクリアモーダル
// ───────────────────────────────────────────
function ClearModal({ visible, taskName, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.clearBox, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.clearStars}>★ ★ ★</Text>
          <Text style={styles.clearTitle}>MISSION CLEAR!</Text>
          <Text style={styles.clearTitle}>ミッションクリア！</Text>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <PixelMascot size={1.5} cleared />
          </View>
          <Text style={styles.clearTask}>「{taskName}」</Text>
          <Text style={styles.clearSub}>をぶっ倒した！</Text>
          <TouchableOpacity style={styles.clearButton} onPress={onClose}>
            <Text style={styles.clearButtonText}>▶ つぎへ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────────────────
// タスクカード
// ───────────────────────────────────────────
function TaskCard({ task, onComplete, onDelete }) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleComplete = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => onComplete(task));
  };

  return (
    <Animated.View style={[styles.taskCard, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] }]}>
        <Text style={styles.priorityText}>{PRIORITY_LABELS[task.priority]}</Text>
      </View>
      <Text style={styles.taskText}>{task.text}</Text>
      <View style={styles.taskButtons}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>✓ クリア</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(task.id)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ───────────────────────────────────────────
// メインアプリ
// ───────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [clearedTask, setClearedTask] = useState(null);
  const [showClear, setShowClear] = useState(false);
  const [filter, setFilter] = useState('all');

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [priority, setPriority] = useState('mid');
  const [recognition, setRecognition] = useState(null);
  const [mascotTalking, setMascotTalking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('taskbuster_tasks');
        if (saved) setTasks(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  const saveTasks = async (newTasks) => {
    setTasks(newTasks);
    try {
      await AsyncStorage.setItem('taskbuster_tasks', JSON.stringify(newTasks));
    } catch {}
  };

  const startListening = () => {
    if (Platform.OS !== 'web') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('音声認識に対応していません。\nSafariで開いてください。');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onend = () => { setIsListening(false); setMascotTalking(false); };
    rec.start();
    setRecognition(rec);
    setIsListening(true);
    setMascotTalking(true);
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
    setIsListening(false);
    setMascotTalking(false);
  };

  const addTask = () => {
    if (!transcript.trim()) return;
    const newTask = { id: Date.now().toString(), text: transcript.trim(), priority, createdAt: Date.now() };
    saveTasks([...tasks, newTask]);
    setTranscript('');
    setPriority('mid');
    setScreen('list');
  };

  const completeTask = (task) => {
    saveTasks(tasks.filter((t) => t.id !== task.id));
    setClearedTask(task);
    setShowClear(true);
  };

  const deleteTask = (id) => saveTasks(tasks.filter((t) => t.id !== id));

  const filteredTasks = tasks
    .filter((t) => filter === 'all' || t.priority === filter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // ───── タスク一覧画面 ─────
  if (screen === 'list') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚔ タスクバスター</Text>
          <Text style={styles.headerSub}>残りミッション: {tasks.length}</Text>
        </View>

        <View style={styles.filterRow}>
          {['all', 'high', 'mid', 'low'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {f === 'all' ? '全部' : PRIORITY_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyArea}>
            <PixelMascot size={1.2} />
            <Text style={styles.emptyText}>
              {tasks.length === 0 ? 'ミッションがないぞ！\n録音ボタンで追加しよう' : 'このカテゴリは空だ！'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskCard task={item} onComplete={completeTask} onDelete={deleteTask} />
            )}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          />
        )}

        <TouchableOpacity style={styles.recordFab} onPress={() => setScreen('record')}>
          <Text style={styles.recordFabText}>🎙 録音する</Text>
        </TouchableOpacity>

        <ClearModal
          visible={showClear}
          taskName={clearedTask?.text || ''}
          onClose={() => setShowClear(false)}
        />
      </View>
    );
  }

  // ───── 録音画面 ─────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopListening(); setTranscript(''); setScreen('list'); }}>
          <Text style={styles.backBtn}>◀ もどる</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎙 アイデア録音</Text>
      </View>

      <View style={styles.mascotArea}>
        <PixelMascot size={1.3} talking={mascotTalking} />
        <Text style={styles.mascotSpeech}>
          {isListening ? 'きいてるよ！\nしゃべって！' : 'マイクを押して\nアイデアを話してね'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micButtonActive]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.micIcon}>{isListening ? '⏹' : '🎙'}</Text>
        <Text style={styles.micLabel}>{isListening ? '録音停止' : '録音スタート'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>▶ 内容（修正できます）</Text>
      <TextInput
        style={styles.textInput}
        value={transcript}
        onChangeText={setTranscript}
        placeholder="ここにアイデアが入ります..."
        placeholderTextColor={COLORS.textDim}
        multiline
      />

      <Text style={styles.sectionLabel}>▶ 優先度</Text>
      <View style={styles.priorityRow}>
        {['high', 'mid', 'low'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p] }]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.priorityBtnText, priority === p && { color: '#000' }]}>
              {PRIORITY_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.addButton, !transcript.trim() && styles.addButtonDisabled]}
        onPress={addTask}
        disabled={!transcript.trim()}
      >
        <Text style={styles.addButtonText}>⚔ ミッション追加！</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ───────────────────────────────────────────
// スタイル
// ───────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accent,
    padding: 16,
    paddingTop: 54,
  },
  headerTitle: { color: COLORS.accent, fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  headerSub: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  backBtn: { color: COLORS.accent, fontSize: 14, marginBottom: 6 },

  filterRow: { flexDirection: 'row', padding: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2, borderColor: COLORS.border, borderRadius: 4 },
  filterBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  filterBtnText: { color: COLORS.textDim, fontSize: 12 },
  filterBtnTextActive: { color: COLORS.accent },

  taskCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: 4, padding: 12, marginBottom: 10,
  },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, marginBottom: 6 },
  priorityText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
  taskText: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  taskButtons: { flexDirection: 'row', gap: 8 },
  completeBtn: { flex: 1, backgroundColor: COLORS.green, padding: 10, borderRadius: 3, alignItems: 'center' },
  completeBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { backgroundColor: COLORS.panel, borderWidth: 2, borderColor: COLORS.red, padding: 10, borderRadius: 3, paddingHorizontal: 14 },
  deleteBtnText: { color: COLORS.red, fontWeight: 'bold', fontSize: 14 },

  emptyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 20, fontSize: 14, lineHeight: 24 },

  recordFab: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 30, paddingVertical: 16, borderRadius: 4,
    shadowColor: COLORS.accent, shadowRadius: 12, shadowOpacity: 0.6,
  },
  recordFabText: { color: '#000', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  mascotArea: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 20, gap: 16 },
  mascotSpeech: {
    color: COLORS.text, fontSize: 14, lineHeight: 22,
    backgroundColor: COLORS.panel, padding: 10, borderRadius: 4,
    borderWidth: 2, borderColor: COLORS.border, maxWidth: 140,
  },

  micButton: {
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: COLORS.accent,
    backgroundColor: COLORS.panel, marginVertical: 16,
  },
  micButtonActive: { borderColor: COLORS.red, backgroundColor: '#2a0a0a' },
  micIcon: { fontSize: 36 },
  micLabel: { color: COLORS.text, fontSize: 11, marginTop: 4 },

  sectionLabel: { color: COLORS.accentDim, fontSize: 12, marginBottom: 6, letterSpacing: 1, marginTop: 4 },
  textInput: {
    backgroundColor: COLORS.panel, borderWidth: 2, borderColor: COLORS.border,
    borderRadius: 4, color: COLORS.text, padding: 12, fontSize: 15,
    minHeight: 100, textAlignVertical: 'top', marginBottom: 20,
  },

  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  priorityBtn: { flex: 1, padding: 12, borderRadius: 4, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  priorityBtnText: { color: COLORS.text, fontSize: 13, fontWeight: 'bold' },

  addButton: { backgroundColor: COLORS.accent, padding: 18, borderRadius: 4, alignItems: 'center' },
  addButtonDisabled: { backgroundColor: COLORS.accentDim, opacity: 0.5 },
  addButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  clearBox: {
    backgroundColor: COLORS.panel, borderWidth: 4, borderColor: COLORS.accent,
    borderRadius: 6, padding: 28, alignItems: 'center', width: '85%',
  },
  clearStars: { color: COLORS.accent, fontSize: 28, marginBottom: 6, letterSpacing: 8 },
  clearTitle: { color: COLORS.accent, fontSize: 26, fontWeight: 'bold', letterSpacing: 2 },
  clearTask: { color: COLORS.text, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  clearSub: { color: COLORS.green, fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  clearButton: { marginTop: 20, backgroundColor: COLORS.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 4 },
  clearButtonText: { color: '#000', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
});
