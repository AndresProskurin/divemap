import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Link } from 'expo-router'
import { createClient } from '@divemap/db'
import { colors } from '@divemap/ui'

export default function SignInScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (!email.trim() || !password) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      Alert.alert('Sign in failed', error.message)
    } else {
      router.replace('/(tabs)/profile')
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <Text style={s.logo}>DIVEMAP</Text>

        <Text style={s.heading}>Sign in</Text>
        <Text style={s.sub}>Log dives, report conditions, plan tech dives.</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.tx3}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={colors.tx3}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={signIn}
          />
          <TouchableOpacity
            onPress={signIn}
            disabled={loading}
            style={[s.btn, loading && { opacity: 0.6 }]}
          >
            <Text style={s.btnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.links}>
          <Link href="/auth/sign-up" asChild>
            <TouchableOpacity>
              <Text style={s.link}>New to DiveMap? Create an account →</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.linkMuted}>Continue without signing in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logo: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 20,
    fontWeight: '700',
    color: colors.acc,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.tx,
  },
  sub: {
    fontSize: 13,
    color: colors.tx3,
    fontWeight: '500',
  },
  form: {
    gap: 10,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.tx,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: colors.acc,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#02222e',
  },
  links: {
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  link: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.acc,
  },
  linkMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.tx3,
  },
})
