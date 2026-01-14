import Config from 'react-native-config';
import React, {useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Platform,
  Keyboard
} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import authFetch from './src/utils/api';
import { handleApiError } from './src/utils/errorHandler';
import { BASE_URL } from './Config';

const STORAGE_KEY_WS = 'app_ws_url';
const STORAGE_KEY_BRANCH = 'branch_id';
const DEFAULT_WS_URL = Config.WS_URL;


export default function App() {
  useKeepAwake();

  const [isReady, setIsReady] = useState(false);
  const [hasBranch, setHasBranch] = useState(false);

  useEffect(() => {
    (async () => {
      const branch = await AsyncStorage.getItem(STORAGE_KEY_BRANCH);
      const token = await AsyncStorage.getItem("accessToken");

      if (!branch || !token) {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
        setHasBranch(false);
        setIsReady(true);
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp < now) {
          await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
          setHasBranch(false);
        } else {
          setHasBranch(true);
        }

      } catch {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
        setHasBranch(false);
      }

      setIsReady(true);
    })();
  }, []);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      {hasBranch ? (
        <AppContent onForceLogout={() => setHasBranch(false)} />
      ) : (
        <LoginScreen onLoginSuccess={() => setHasBranch(true)} />
      )}
    </SafeAreaProvider>
  );
}

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);

    try {
      const param = new URLSearchParams();
      param.append('username', id);
      param.append('password', pw);

      console.log(`${BASE_URL}`+'/admin_login');

      const res = await fetch(`${BASE_URL}`+'/admin_login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: param.toString(),
      });     

      // 🔥 로그인 실패 처리
      if (!res.ok) {
       await handleApiError(res);
    }
    

    const data = await res.json();
    
      if (data.branch_id) {
        await AsyncStorage.setItem('accessToken', data.access_token);
        await AsyncStorage.setItem('refreshToken', data.refresh_token);              
        await AsyncStorage.setItem(STORAGE_KEY_BRANCH, String(data.branch_id));
        onLoginSuccess();
      } else {
        setError(data.message || '로그인 실패');
      }
    } catch (err) {
      console.log('LOGIN ERROR', err);
      setError(err?.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <View style={{ width: '85%', padding: 24, borderRadius: 12, backgroundColor: '#f7f7f7', elevation: 2 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center' }}>로그인</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fff' }}
          placeholder="아이디"
          autoCapitalize="none"
          value={id}
          onChangeText={setId}
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fff' }}
          placeholder="비밀번호"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
        />
        {error ? <Text style={{ color: '#d00', marginBottom: 8, textAlign: 'center' }}>{error}</Text> : null}
        <TouchableOpacity
          style={{ backgroundColor: '#007aff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{loading ? '로그인 중...' : '로그인'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function AppContent({ onForceLogout }: { onForceLogout: () => void }) {
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState(''); // 최대 8자리 숫자
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('closed');
  const wsRef = useRef<WebSocket | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'ws' | 'logout'>('ws');
  const [editingUrl, setEditingUrl] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [userInfo, setUserInfo] = useState<any | null>(null); // user 정보 상태
  const [enrollInfo, setEnrollInfo] = useState<any | null>(null); // user 정보 상태 

  const [countdown, setCountdown] = useState(5);
const [showCountdown, setShowCountdown] = useState(false);

const intervalRef = useRef(null);
const timeoutRef = useRef(null);
const inputRef = useRef(null);

useEffect(() => {
  if (!userInfo) return;

  setShowCountdown(false);
  setCountdown(6);

  timeoutRef.current = setTimeout(() => {
    setShowCountdown(true);

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setDigits('');
          setUserInfo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, 1000);

  return () => {
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  };
}, [userInfo]); 


  // 계산기 스타일 입력을 위한 핸들러
const onPressDigit = (d: string) => {
  setDigits(prev => {
    if (prev.length >= 8) return prev;
    const next = prev + d;
    if (next.length === 8) {
      // 자동 전송(약간의 딜레이로 UI 반응 보장)
      setTimeout(() => sendPhone(next), 50);
    }
    return next;
  });
};

const onBackspace = () => {
  setDigits(prev => prev.slice(0, -1));
};

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_WS);
        const url = saved ?? DEFAULT_WS_URL;
        setWsUrl(url);
        setEditingUrl(url);
      } catch (e) {
        setWsUrl(DEFAULT_WS_URL);
        setEditingUrl(DEFAULT_WS_URL);
      }
    })();
  }, []);

  useEffect(() => {
    if (!wsUrl) return;
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setConnectionState('connecting');

      ws.onopen = () => setConnectionState('open');
      ws.onclose = () => setConnectionState('closed');
      ws.onerror = () => setConnectionState('error');
      ws.onmessage = e => {
        console.log('WS message:', e.data);
      };
    } catch (err) {
      setConnectionState('error');
    }

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [wsUrl]);

  const handleChange = (text: string) => {
    const onlyDigits = text.replace(/[^0-9]/g, '');
    const truncated = onlyDigits.slice(0, 8);
    setDigits(truncated);
    if (truncated.length === 8) {
      sendPhone(truncated);
    }
  };

  const sendPhone = async (eightDigits: string) => {
    const phone = '010' + eightDigits;

    console.log(`/users?phone=${phone}`);
    try {
      const userRes = await authFetch(`/users?phone=${phone}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

  if (!userRes.ok) {
    Alert.alert('유저 조회 실패', '서버에서 유저 정보를 받아오지 못했습니다.');
    return;
  } 
  
  let user=await userRes.json();
  console.log(user);
  if (!user) return false;  

  setUserInfo(user);
  Keyboard.dismiss();  
  inputRef.current?.blur();  

  const enrollRes = await authFetch(`/enrolls?user_id=${user.id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });



  if (!enrollRes.ok) {
    Alert.alert('등록 정보 조회 실패', '서버에서 enroll 정보를 받아오지 못했습니다.');
    return;
  }

    let enroll=await enrollRes.json();
  if (!enroll) return false;

  console.log(enroll);

  setEnrollInfo(enroll);


      // user 정보 활용 필요시 여기에 추가
      // 2. 웹소켓 전송
      if (!wsRef.current || connectionState !== 'open') {
       // Alert.alert('웹소켓 미연결', '서버에 연결되어 있지 않습니다. 설정에서 주소를 확인하세요.');
        return;
      }
      wsRef.current.send(eightDigits); // 기존대로 8자리만 전송
      setDigits('');
    } catch (e) {
      console.log(e);
      Alert.alert('전송 실패', '유저 조회 또는 웹소켓 전송 중 오류가 발생했습니다.');
    }
  };

  const formatPhone = (input: string) => {
    // input: 최대 8자리 숫자 -> 010 - xxxx - xxxx
    const a = input.slice(0, 4);
    const b = input.slice(4, 8);
    if (!a) return '010 - ';
    if (!b) return `010 - ${a}`;
    return `010 - ${a} - ${b}`;
  };

  const saveSettings = async () => {
    const trimmed = editingUrl.trim();
    if (!trimmed) {
      Alert.alert('오류', '웹소켓 URL을 입력하세요.');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY_WS, trimmed);
      setWsUrl(trimmed);
      setSettingsVisible(false);
      Alert.alert('저장됨', '웹소켓 주소를 저장했습니다. 재연결을 시도합니다.');
    } catch (e) {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await AsyncStorage.multiRemove([
        'accessToken',
        'refreshToken',
        STORAGE_KEY_BRANCH,
      ]);
      setSettingsVisible(false);
      onForceLogout(); // 즉시 상위(App)에서 로그인 화면으로 전환
    } catch (e) {
      Alert.alert('오류', '로그아웃 실패');
    } finally {
      setLoggingOut(false);
    }
  };



const renderEnrollInfo = (enrollInfo) => {
  if (!enrollInfo || !enrollInfo.total) {
    return <Text  style={{fontSize: 50}}>유효한 회원권이 없습니다.</Text>;
  }

  const endDateStr = enrollInfo.enroll_list[0].end_date;

  const endDate = new Date(endDateStr);

const formattedDate = endDate.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

  // 오늘 날짜를 문자열로 고정 (로컬/UTC 흔들림 제거)
  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const toUtcDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const diffDays =
    (toUtcDate(endDateStr) - toUtcDate(todayStr)) / 86400000;

  return (
    <Text style={{fontSize: 50}}>
      종료일 ({formattedDate})까지{' '}
      <Text style={{ fontSize: 70, fontWeight: '700' }}>
        {Math.max(0, diffDays)}
      </Text>
      일 남았습니다.
    </Text>
  );
};


  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setSettingsTab('ws'); setSettingsVisible(true); }} style={styles.hamburger}>
          <View style={styles.hamLine} />
          <View style={styles.hamLine} />
          <View style={styles.hamLine} />
        </TouchableOpacity>
        <Text style={styles.title}>전화번호 입력</Text>
        <View style={{width: 40}} />
      </View>

      {userInfo ? (
        <View style={styles.content}>
          <Text style={styles.label}>사용자 정보</Text>
          <View style={{marginVertical: 16, padding: 16, backgroundColor: '#f2f2f2', borderRadius: 8}}>
              <View  style={{marginBottom: 8}}>
                <Text style={{fontWeight: '600', fontSize: 30}}>회원명 : {userInfo.name}</Text>
                <Text style={{fontWeight: '400', fontSize: 30}}>회원번호 : {userInfo.branch_id}#{userInfo.id}</Text>                
                {renderEnrollInfo(enrollInfo)}
              </View>
          </View>
<TouchableOpacity
  style={styles.sendButton}
  onPress={() => setUserInfo(null)}
>
<Text style={styles.sendButtonText}>
  입력창으로 돌아가기
  {showCountdown ? ` (${countdown}초)` : ''}
</Text>
</TouchableOpacity>
        </View>
      ) : (
      
      <>
      <View style={styles.content}>
          <Text style={styles.label}>전화번호 (010 - xxxx - xxxx)</Text>
          <Text style={styles.display}>{formatPhone(digits)}</Text>
          <TextInput
            style={styles.input}
            value={digits}
            onChangeText={handleChange}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            maxLength={8}
            ref={inputRef}
            placeholder="8자리 번호만 입력하세요"
          />
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>상태: {connectionState}</Text>
          </View>
        </View>
      <View style={styles.keypadContainer}>
  <View style={styles.keypadRow}>
    {['1','2','3'].map(n => (
      <TouchableOpacity key={n} style={styles.key} onPress={() => onPressDigit(n)}>
        <Text style={styles.keyText}>{n}</Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.keypadRow}>
    {['4','5','6'].map(n => (
      <TouchableOpacity key={n} style={styles.key} onPress={() => onPressDigit(n)}>
        <Text style={styles.keyText}>{n}</Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.keypadRow}>
    {['7','8','9'].map(n => (
      <TouchableOpacity key={n} style={styles.key} onPress={() => onPressDigit(n)}>
        <Text style={styles.keyText}>{n}</Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.keypadRow}>
    <TouchableOpacity style={[styles.key, styles.keyAction]} onPress={onBackspace}>
      <Text style={styles.keyText}>⌫</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.key} onPress={() => onPressDigit('0')}>
      <Text style={styles.keyText}>0</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.key, styles.keyAction]}
      onPress={() => {
        if (digits.length === 8) sendPhone(digits);
        else Alert.alert('입력 오류', '8자리 번호를 입력해야 합니다.');
      }}>
      <Text style={styles.keyText}>전송</Text>
    </TouchableOpacity>
  </View>
</View>
</>
            )}
      <Modal visible={settingsVisible} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, settingsTab === 'ws' && styles.tabBtnActive]}
              onPress={() => setSettingsTab('ws')}
            >
              <Text style={[styles.tabBtnText, settingsTab === 'ws' && styles.tabBtnTextActive]}>웹소켓 설정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, settingsTab === 'logout' && styles.tabBtnActive]}
              onPress={() => setSettingsTab('logout')}
            >
              <Text style={[styles.tabBtnText, settingsTab === 'logout' && styles.tabBtnTextActive]}>로그아웃</Text>
            </TouchableOpacity>
          </View>
          {settingsTab === 'ws' ? (
            <>
              <Text style={styles.modalTitle}>웹소켓 주소</Text>
              <TextInput
                style={styles.modalInput}
                value={editingUrl}
                onChangeText={setEditingUrl}
                placeholder={DEFAULT_WS_URL}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalBtn} onPress={saveSettings}>
                  <Text style={styles.modalBtnText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, {backgroundColor: '#ddd'}]}
                  onPress={() => {
                    setEditingUrl(wsUrl ?? DEFAULT_WS_URL);
                    setSettingsVisible(false);
                  }}>
                  <Text style={[styles.modalBtnText, {color: '#000'}]}>취소</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>로그아웃</Text>
              <Text style={{marginBottom: 24, color: '#666'}}>로그아웃 시 모든 인증 정보가 삭제됩니다.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, {backgroundColor: '#d00'}]}
                  onPress={handleLogout}
                  disabled={loggingOut}
                >
                  <Text style={[styles.modalBtnText, {color: '#fff'}]}>{loggingOut ? '로그아웃 중...' : '로그아웃'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, {backgroundColor: '#ddd'}]}
                  onPress={() => setSettingsVisible(false)}
                  disabled={loggingOut}
                >
                  <Text style={[styles.modalBtnText, {color: '#000'}]}>취소</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  hamburger: {width: 40, justifyContent: 'center'},
  hamLine: {height: 3, backgroundColor: '#000', marginVertical: 2, borderRadius: 2},
  title: {fontSize: 18, fontWeight: '600'},
  content: {flex: 1, padding: 20},
  label: {fontSize: 14, color: '#666'},
  display: {fontSize: 20, marginVertical: 12},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 18,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusRow: {marginTop: 20},
  statusText: {color: '#444', marginTop: 4},
  sendButtonText: {color: '#fff'},
  modalContainer: {flex: 1, padding: 20, backgroundColor: '#fff'},
  modalTitle: {fontSize: 20, fontWeight: '700', marginBottom: 12},
  modalLabel: {fontSize: 14, color: '#666'},
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  modalButtons: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 20},
  modalBtn: {flex: 1, backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 6},
  modalBtnText: {color: '#fff', fontWeight: '600'},

  tabRow: {flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee'},
  tabBtn: {flex: 1, paddingVertical: 12, alignItems: 'center'},
  tabBtnActive: {borderBottomWidth: 2, borderBottomColor: '#007aff'},
  tabBtnText: {fontSize: 16, color: '#888'},
  tabBtnTextActive: {color: '#007aff', fontWeight: '700'},

  /* keypad styles */
keypadContainer: {marginTop: 8},
keypadRow: {flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6},
key: {flex: 1, marginHorizontal: 6, backgroundColor: '#f2f2f2', borderRadius: 8, paddingVertical: 18, alignItems: 'center', justifyContent: 'center'},
keyText: {fontSize: 20, fontWeight: '600'},
keyAction: {backgroundColor: '#d0e8ff'},
});