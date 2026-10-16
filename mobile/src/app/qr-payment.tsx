import { useEffect, useState, type ComponentProps } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { CHAT_MESSAGES_API_URL, QR_PERCENTAGES_API_URL } from '@/constants/api';
import { useAuthUser } from '@/lib/auth-session';

const C = { navy: '#102344', blue: '#3563E9', bg: '#F5F7FC', white: '#FFFFFF', muted: '#7C879B', border: '#E2E7F0', pale: '#E9EFFF', orange: '#B86B13', green: '#16846A' };
type QrRecord = { id: number | string; name?: string; source: string; percentage: number | string; imps?: number | string; msg?: string };
type QrItem = { id: string; name: string; image: string; percentage: number; imps: number; msg: string };
type PaymentProof = { uri: string; name: string; type: string; file?: Blob };
const currency = '\u20B9';
const money = (value: number) => `${currency}${Math.max(0, value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function QRPaymentScreen() {
  const user = useAuthUser();
  const [qrItems, setQrItems] = useState<QrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedQr, setSelectedQr] = useState<QrItem | null>(null);
  const [amount, setAmount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(QR_PERCENTAGES_API_URL, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load QR codes (server ${response.status}).`);
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('The QR list returned an unexpected response.');
        return data.map((record: QrRecord) => ({
          id: String(record.id),
          name: record.name?.trim() || `QR ${record.id}`,
          image: record.source,
          percentage: Number(record.percentage),
          imps: Number(record.imps)||0,
          msg: record.msg||'',
        })).filter((item: QrItem) => Number.isFinite(item.percentage));
      })
      .then((items: QrItem[]) => { if (active) setQrItems(items); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not connect to the QR service.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const chooseQr = (qr: QrItem) => {
    setSelectedQr(qr);
    setAmount('');
    setProof(null);
    setSubmitted(false);
    setSubmitError('');
  };

  const chooseProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('Screenshot too large', 'Choose an image that is 10 MB or smaller.');
          return;
        }
        const type = asset.mimeType || 'image/jpeg';
        const extension = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        setProof({ uri: asset.uri, name: asset.fileName || `payment-proof-${Date.now()}.${extension}`, type, file: asset.file });
      }
    } catch {
      Alert.alert('Photo unavailable', 'Please try selecting your payment screenshot again.');
    }
  };

  const amountValue = Number(amount) || 0;
  const fee = selectedQr ? amountValue * selectedQr.percentage / 100 : 0;
  const impsFee = selectedQr?.imps || 0;
  const totalCharges = fee + impsFee;
  const net = Math.max(0, amountValue - totalCharges);

  const submit = async () => {
    if (amountValue <= 0 || !Number.isFinite(amountValue)) {
      Alert.alert('Enter amount', 'Enter an amount greater than zero.');
      return;
    }
    if (!accountHolderName.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !mobileNumber.trim()) {
      Alert.alert('Complete payout details', 'Enter the account holder, bank, account number, IFSC code, and mobile number.');
      return;
    }
    const normalizedMobile = (mobileNumber || user?.mobile_number || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      Alert.alert('Check mobile number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) {
      Alert.alert('Check IFSC code', 'Enter a valid 11-character IFSC code.');
      return;
    }
    if (accountNumber.trim().replace(/\s/g, '').length < 6) {
      Alert.alert('Check account number', 'Enter an account number with at least 6 characters.');
      return;
    }
    if (!proof) {
      Alert.alert('Screenshot required', 'Upload your payment screenshot before submitting.');
      return;
    }
    if (!user?.token) {
      Alert.alert('Login required', 'Please log in again before submitting your payment.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const paymentDetails = [
      'QR PAYMENT SUBMISSION',
      `Customer: ${user.name} (Account #${user.id})`,
      `Customer mobile: ${normalizedMobile}`,
      `Email: ${user.email}`,
      `Account holder: ${accountHolderName.trim()}`,
      `Customer bank: ${bankName.trim()}`,
      `Payout account number: ${accountNumber.trim().replace(/\s/g, '')}`,
      `Payout IFSC code: ${ifscCode.trim().toUpperCase()}`,
      `QR code: ${selectedQr?.name || 'QR code'}`,
      `Amount paid: ${money(amountValue)}`,
      `MDR rate: ${selectedQr?.percentage ?? 0}%`,
      `MDR fee: ${money(fee)}`,
      `IMPS charge: ${money(impsFee)}`,
      `Total charges: ${money(totalCharges)}`,
      `Net amount after fees: ${money(net)}`,
      selectedQr?.msg.trim() ? `QR availability notice: ${selectedQr.msg.trim()}` : '',
    ].filter(Boolean).join('\n');

    try {
      const form = new FormData();
      form.append('text', paymentDetails);
      if (Platform.OS === 'web') {
        // Browsers upload a Blob; native platforms use Expo's Blob-compatible File.
        let proofBlob: Blob | undefined = proof.file;
        if (!proofBlob) {
          const result = await fetch(proof.uri);
          if (!result.ok) throw new Error('Could not read the selected screenshot. Please choose it again.');
          proofBlob = await result.blob();
        }
        form.append('image', proofBlob, proof.name);
      } else {
        form.append('image', new File(proof.uri), proof.name);
      }

      const response = await expoFetch(CHAT_MESSAGES_API_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${user.token}` },
        body: form,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result?.detail === 'string' ? result.detail : typeof result?.image?.[0] === 'string' ? result.image[0] : `Server returned ${response.status}.`;
        throw new Error(detail);
      }
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send your payment details. Check your connection and retry.';
      setSubmitError(message);
      Alert.alert('Payment submission failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (submitted) {
      setSubmitted(false);
      setSelectedQr(null);
      return;
    }
    if (selectedQr) {
      setSelectedQr(null);
      setAmount('');
      setProof(null);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={s.back} onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={s.kicker}>SERVICE 01</Text>
        <Text style={s.title}>QR Payment</Text>
        <Text style={s.sub}>{selectedQr ? 'Enter the payment amount and attach your payment screenshot.' : 'Choose a QR code to see its payment details and MDR fee.'}</Text>

        {loading && <View style={s.stateCard}><Text style={s.stateText}>Loading available QR codes…</Text></View>}
        {!loading && loadError !== '' && <View style={s.errorCard}><Ionicons name="cloud-offline-outline" size={22} color="#C04444"/><Text style={s.errorText}>{loadError}</Text></View>}
        {!loading && !loadError && qrItems.length === 0 && <View style={s.stateCard}><Ionicons name="qr-code-outline" size={30} color={C.muted}/><Text style={s.stateTitle}>No QR codes available</Text><Text style={s.stateText}>Please check back after an admin adds a QR code.</Text></View>}

        {!selectedQr && !loading && !loadError && qrItems.map((qr) => (
          <Pressable key={qr.id} style={({ pressed }) => [s.qrRow, pressed && s.pressed]} onPress={() => chooseQr(qr)} accessibilityRole="button" accessibilityLabel={`Select ${qr.name}, ${qr.percentage} percent fee`}>
            <Image source={{ uri: qr.image }} style={s.qrThumb} />
            <View style={s.qrCopy}>
              <Text style={s.qrName}>{qr.name}</Text>
              <Text style={s.qrMdr}>MDR fee</Text>
              <Text style={s.qrImps}>IMPS charge: {money(qr.imps)}</Text>
              {qr.msg.trim()?<View style={s.cautionInline}><Ionicons name="warning-outline" size={15} color="#A61B1B"/><Text style={s.cautionInlineText}>{qr.msg}</Text></View>:null}
            </View>
            <View style={s.ratePill}><Text style={s.rateValue}>{qr.percentage}%</Text></View>
            <Ionicons name="chevron-forward" size={19} color={C.muted}/>
          </Pressable>
        ))}

        {selectedQr && !submitted && <>
          <View style={s.selectedCard}>
            <Image source={{ uri: selectedQr.image }} style={s.largeQr} resizeMode="contain" />
            <Text style={s.selectedName}>{selectedQr.name}</Text>
            <Text style={s.selectedMdr}>MDR fee: {selectedQr.percentage}% · IMPS {money(selectedQr.imps)}</Text>
            {selectedQr.msg.trim()?<View style={[s.cautionBox,{alignSelf:'stretch'}]}><View style={s.cautionHeading}><Ionicons name="warning-outline" size={17} color="#A61B1B"/><Text style={s.cautionTitle}>QR availability notice</Text></View><Text style={s.cautionMessage}>{selectedQr.msg}</Text></View>:null}
          </View>

          <View style={s.card}>
            <Text style={s.label}>Amount</Text>
            <View style={s.inputRow}>
              <Text style={s.currency}>{currency}</Text>
              <TextInput style={s.amount} value={amount} onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} keyboardType="decimal-pad" placeholder="Enter amount" placeholderTextColor="#9AA3B5" accessibilityLabel="Payment amount" />
            </View>
            <Text style={s.section}>Payout account details</Text>
            <PaymentField label="Account holder name" value={accountHolderName} onChangeText={setAccountHolderName} placeholder="Name on bank account" autoCapitalize="words" />
            <PaymentField label="Customer bank name" value={bankName} onChangeText={setBankName} placeholder="Bank name" autoCapitalize="words" />
            <PaymentField label="Account number" value={accountNumber} onChangeText={(value) => setAccountNumber(value.replace(/\s/g, ''))} placeholder="Enter account number" keyboardType="number-pad" />
            <PaymentField label="IFSC code" value={ifscCode} onChangeText={(value) => setIfscCode(value.toUpperCase().replace(/\s/g, ''))} placeholder="e.g. SBIN0001234" autoCapitalize="characters" maxLength={11} />
            <PaymentField label="Mobile number" value={mobileNumber || user?.mobile_number || ''} onChangeText={setMobileNumber} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={13} />
            <Text style={s.section}>Payment summary</Text>
            <SummaryRow label={`MDR fee (${selectedQr.percentage}%)`} value={`- ${money(fee)}`} />
            <SummaryRow label="IMPS charge" value={`- ${money(impsFee)}`} />
            <SummaryRow label="Total charges" value={`- ${money(totalCharges)}`} />
            <SummaryRow label="Net amount after fees" value={money(net)} bold />
          </View>

          <Pressable style={s.upload} onPress={() => void chooseProof()} disabled={submitting} accessibilityRole="button" accessibilityLabel="Upload payment screenshot, required">
            <Ionicons name="image-outline" size={23} color={C.blue}/>
            <Text style={s.uploadText}>{proof ? 'Screenshot attached - change photo' : 'Upload payment screenshot (required)'}</Text>
          </Pressable>
          {proof && <Image source={{ uri: proof.uri }} style={s.proofPreview} resizeMode="contain" />}
          {submitError !== '' && <View style={s.submitError}><Ionicons name="alert-circle-outline" size={18} color="#A12D2A"/><Text style={s.submitErrorText}>{submitError}</Text></View>}
          <Pressable style={[s.submitButton, submitting && s.disabled]} onPress={() => void submit()} disabled={submitting} accessibilityRole="button">
            {submitting ? <><Text style={s.submitText}>Sending to admin…</Text></> : <><Text style={s.submitText}>Submit</Text><Ionicons name="arrow-forward" size={18} color={C.white}/></>}
          </Pressable>
        </>}

        {submitted && selectedQr && <View style={s.successCard}>
          <View style={s.successIcon}><Ionicons name="checkmark" size={26} color={C.white}/></View>
          <Text style={s.successTitle}>Payment details submitted</Text>
          <Text style={s.successCopy}>{selectedQr.name} · Amount {money(amountValue)} · MDR fee {money(fee)} · IMPS {money(impsFee)} · Net amount {money(net)}</Text>
          <Text style={s.pending}>Pending admin review</Text>
          <Text style={s.smallNote}>Payment details and your screenshot were sent to the SVBS admin chat for review.</Text>
          <Pressable style={s.submitButton} onPress={goBack}><Text style={s.submitText}>Back to QR codes</Text></Pressable>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return <View style={s.summaryRow}><Text style={[s.summaryLabel, bold && s.summaryBold]}>{label}</Text><Text style={[s.summaryValue, bold && s.summaryBold]}>{value}</Text></View>;
}

function PaymentField({ label, ...inputProps }: { label: string } & ComponentProps<typeof TextInput>) {
  return <View style={s.fieldWrap}><Text style={s.fieldLabel}>{label}</Text><TextInput {...inputProps} style={s.fieldInput} placeholderTextColor="#9AA3B5" accessibilityLabel={label} autoCorrect={false} /></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, page: { padding: 20, paddingBottom: 32 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  kicker: { fontSize: 10, fontWeight: '800', color: C.blue, letterSpacing: 1.2 }, title: { fontSize: 28, fontWeight: '800', color: C.navy, marginTop: 6 },
  sub: { fontSize: 13, color: C.muted, lineHeight: 19, marginTop: 5, marginBottom: 17 },
  qrRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17 },
  cautionInline:{flexDirection:"row",alignItems:"center",gap:5,marginTop:6,paddingVertical:5,paddingHorizontal:7,borderRadius:8,backgroundColor:"#FFF0EF"},cautionInlineText:{flex:1,fontSize:11,fontWeight:"700",color:"#8E1B15"}, cautionBox:{marginTop:8,padding:11,borderRadius:11,backgroundColor:'#FFF0EF',borderWidth:1,borderColor:'#E5A5A1'}, cautionHeading:{flexDirection:'row',alignItems:'center',gap:6},cautionTitle:{fontSize:11,fontWeight:'800',color:'#8E1B15'},cautionMessage:{fontSize:12,color:'#7C2723',lineHeight:18,marginTop:5},
  pressed: { opacity: 0.78 }, qrThumb: { width: 56, height: 56, borderRadius: 11, backgroundColor: C.pale }, qrCopy: { flex: 1 }, qrName: { color: C.navy, fontSize: 15, fontWeight: '800' }, qrMdr: { color: C.muted, fontSize: 11, marginTop: 4 }, qrImps: { color: C.navy, fontSize: 11, fontWeight: '700', marginTop: 4 },
  ratePill: { backgroundColor: C.pale, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 }, rateValue: { color: C.blue, fontSize: 13, fontWeight: '800' },
  stateCard: { alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 24 }, stateTitle: { color: C.navy, fontSize: 15, fontWeight: '800' }, stateText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 15, backgroundColor: '#FFF0EF' }, errorText: { flex: 1, color: '#A93F3A', fontSize: 12, lineHeight: 18 },
  selectedCard: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 17, marginBottom: 12 }, largeQr: { width: 190, height: 190, borderRadius: 12, backgroundColor: C.white }, selectedName: { color: C.navy, fontSize: 16, fontWeight: '800', marginTop: 10 }, selectedMdr: { color: C.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 17, marginBottom: 12 }, label: { fontSize: 14, fontWeight: '800', color: C.navy }, inputRow: { height: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 13, marginTop: 9, backgroundColor: C.white }, currency: { color: C.navy, fontSize: 19, fontWeight: '800' }, amount: { flex: 1, height: '100%', color: C.navy, fontSize: 18, paddingLeft: 9 }, section: { fontSize: 15, fontWeight: '800', color: C.navy, marginTop: 19, marginBottom: 7 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7 }, summaryLabel: { flex: 1, color: C.muted, fontSize: 13 }, summaryValue: { color: C.muted, fontSize: 13, textAlign: 'right' }, summaryBold: { color: C.navy, fontSize: 14, fontWeight: '800' },
  fieldWrap: { marginTop: 11 }, fieldLabel: { fontSize: 12, fontWeight: '700', color: C.navy, marginBottom: 6 }, fieldInput: { minHeight: 50, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, color: C.navy, fontSize: 15, backgroundColor: C.white },
  upload: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#AAB9D0', backgroundColor: C.white }, uploadText: { flex: 1, color: C.navy, fontSize: 13, fontWeight: '700' }, proofPreview: { width: '100%', height: 190, marginTop: 10, backgroundColor: C.white, borderRadius: 14 },
  submitError:{flexDirection:'row',alignItems:'center',gap:8,padding:12,marginTop:10,borderRadius:12,backgroundColor:'#FFF0EF'},submitErrorText:{flex:1,color:'#A12D2A',fontSize:12,lineHeight:17},disabled:{opacity:0.6},
  submitButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: C.blue, borderRadius: 15, marginTop: 14 }, submitText: { color: C.white, fontSize: 14, fontWeight: '800' },
  successCard: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 19, padding: 22 }, successIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green }, successTitle: { color: C.navy, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 13 }, successCopy: { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9 }, pending: { color: C.orange, fontWeight: '800', fontSize: 13, marginTop: 13 }, smallNote: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 12 },
});
