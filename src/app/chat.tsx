import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { CHAT_CONVERSATIONS_API_URL, CHAT_MESSAGES_API_URL, CHAT_TYPING_API_URL } from '@/constants/api';
import { useAuthUser } from '@/lib/auth-session';

const C={navy:'#102344',blue:'#3563E9',bg:'#F5F7FC',white:'#FFFFFF',muted:'#7C879B',border:'#E2E7F0',pale:'#E9EFFF',green:'#16846A'};
type ChatMessage={id:number;text:string;image:string|null;left_face_image:string|null;right_face_image:string|null;sender_id:number;sender_name:string;sender_role:'admin'|'user';delivered_to_customer:boolean;delivered_to_admin:boolean;read_by_customer:boolean;read_by_admin:boolean;created_at:string};
type ChatConversation={id:number;customer:{id:number;name:string;email:string;mobile_number:string};last_message:ChatMessage|null;unread_count:number;updated_at:string};
type PickedPhoto={uri:string;name:string;type:string;file?:Blob};

export default function ChatScreen(){
  const params=useLocalSearchParams<{manualPrompt?:string;conversationId?:string;customerName?:string}>();
  const user=useAuthUser();
  const conversationId=useMemo(()=>Number(params.conversationId)||null,[params.conversationId]);
  const isAdmin=user?.role==='admin';
  const [showManualPrompt,setShowManualPrompt]=useState(params.manualPrompt==='1');
  const [flashOpacity]=useState(()=>new Animated.Value(0));
  const [draft,setDraft]=useState('');
  const [pickedPhoto,setPickedPhoto]=useState<PickedPhoto|null>(null);
  const [viewingImage,setViewingImage]=useState<string|null>(null);
  const [peerTyping,setPeerTyping]=useState(false);
  const typingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const typingActive=useRef(false);
  const lastTypingSentAt=useRef(0);
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [conversations,setConversations]=useState<ChatConversation[]>([]);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const scrollRef=useRef<ScrollView>(null);

  const headers=useMemo(()=>({Accept:'application/json',Authorization:`Bearer ${user?.token||''}`}),[user?.token]);
  const loadMessages=useCallback(async()=>{
    if(!user||isAdmin&&!conversationId)return;
    try{
      const url=isAdmin?`${CHAT_CONVERSATIONS_API_URL}${conversationId}/messages/`:CHAT_MESSAGES_API_URL;
      const response=await fetch(url,{headers});
      if(!response.ok)throw new Error(response.status===401?'Your login expired. Please log in again.':`Could not load messages (${response.status}).`);
      const data:unknown=await response.json();
      if(!Array.isArray(data))throw new Error('The server returned an invalid message list.');
      setMessages(data as ChatMessage[]);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Could not load messages. Check your connection.');}
    finally{setLoading(false);}
  },[user,isAdmin,conversationId,headers]);
  const typingUrl=isAdmin?`${CHAT_CONVERSATIONS_API_URL}${conversationId}/typing/`:CHAT_TYPING_API_URL;
  const postTypingStatus=useCallback((isTyping:boolean)=>{
    if(!user||isAdmin&&!conversationId)return;
    typingActive.current=isTyping;
    if(isTyping)lastTypingSentAt.current=Date.now();
    void fetch(typingUrl,{method:'POST',headers:{Accept:'application/json',Authorization:`Bearer ${user.token}`,'Content-Type':'application/json'},body:JSON.stringify({is_typing:isTyping})}).catch(()=>{});
  },[user,typingUrl,isAdmin,conversationId]);
  const stopTyping=useCallback(()=>{
    if(typingTimer.current){clearTimeout(typingTimer.current);typingTimer.current=null;}
    if(typingActive.current)postTypingStatus(false);
  },[postTypingStatus]);
  const onDraftChange=useCallback((value:string)=>{
    setDraft(value);
    if(!value.trim()){stopTyping();return;}
    if(!typingActive.current||Date.now()-lastTypingSentAt.current>=2000)postTypingStatus(true);
    if(typingTimer.current)clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(stopTyping,1800);
  },[postTypingStatus,stopTyping]);
  const loadPeerTyping=useCallback(async()=>{
    if(!user||isAdmin&&!conversationId)return;
    try{const response=await fetch(typingUrl,{headers:{Accept:'application/json',Authorization:`Bearer ${user.token}`}});if(!response.ok)return;const result=await response.json() as {is_typing?:boolean};setPeerTyping(result.is_typing===true);}catch{/* A momentary presence check failure should not interrupt chat. */}
  },[user,typingUrl,isAdmin,conversationId]);

  const loadConversations=useCallback(async()=>{
    if(!user||!isAdmin)return;
    try{
      const response=await fetch(CHAT_CONVERSATIONS_API_URL,{headers});
      if(!response.ok)throw new Error(response.status===401?'Your login expired. Please log in again.':`Could not load conversations (${response.status}).`);
      const data:unknown=await response.json();
      if(!Array.isArray(data))throw new Error('The server returned an invalid conversation list.');
      setConversations(data as ChatConversation[]);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Could not load conversations. Check your connection.');}
    finally{setLoading(false);}
  },[user,isAdmin,headers]);

  useEffect(()=>{const initial=setTimeout(()=>{if(!user){router.replace('/login' as never);return;}if(isAdmin&&!conversationId)void loadConversations();else void loadMessages();},0);return()=>clearTimeout(initial);},[user,isAdmin,conversationId,loadMessages,loadConversations]);
  useEffect(()=>{if(!showManualPrompt)return;const animation=Animated.sequence([Animated.timing(flashOpacity,{toValue:1,duration:350,useNativeDriver:true}),Animated.delay(11500),Animated.timing(flashOpacity,{toValue:0,duration:350,useNativeDriver:true})]);animation.start(({finished})=>{if(finished)setShowManualPrompt(false)});return()=>animation.stop();},[showManualPrompt,flashOpacity]);
  useEffect(()=>{if(!user)return;const timer=setInterval(()=>{if(isAdmin&&!conversationId)void loadConversations();else void loadMessages();},6000);return()=>clearInterval(timer);},[user,isAdmin,conversationId,loadMessages,loadConversations]);
  useEffect(()=>{if(!user||isAdmin&&!conversationId)return;const initial=setTimeout(()=>void loadPeerTyping(),0);const timer=setInterval(()=>void loadPeerTyping(),1500);return()=>{clearTimeout(initial);clearInterval(timer)};},[user,isAdmin,conversationId,loadPeerTyping]);
  useEffect(()=>{if(messages.length)scrollRef.current?.scrollToEnd({animated:true});},[messages]);

  const send=async()=>{
    const text=draft.trim();const photo=pickedPhoto;if((!text&&!photo)||sending)return;
    if(!user)return;
    stopTyping();
    setSending(true);setError('');
    try{
      const url=isAdmin?`${CHAT_CONVERSATIONS_API_URL}${conversationId}/messages/`:CHAT_MESSAGES_API_URL;
      let body:FormData|string;let requestHeaders:Record<string,string>={Authorization:`Bearer ${user.token}`,Accept:'application/json'};
      if(photo){
        const form=new FormData();if(text)form.append('text',text);
        // Web uploads its selected Blob; native platforms use Expo's Blob-compatible File.
        if(Platform.OS==='web'){
          let photoBlob:Blob|undefined=photo.file;
          if(!photoBlob){const result=await fetch(photo.uri);if(!result.ok)throw new Error('Could not read the selected photo. Please choose it again.');photoBlob=await result.blob();}
          form.append('image',photoBlob,photo.name);
        }else{form.append('image',new File(photo.uri),photo.name);}
        body=form;
      }else{body=JSON.stringify({text});requestHeaders['Content-Type']='application/json';}
      const response=await expoFetch(url,{method:'POST',headers:requestHeaders,body});
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:typeof data?.image?.[0]==='string'?data.image[0]:`Message could not be sent (${response.status}).`);
      setDraft('');setPickedPhoto(null);await loadMessages();if(isAdmin)await loadConversations();
    }catch(e){const message=e instanceof Error?e.message:'Message could not be sent. Check your connection.';setError(message);Alert.alert('Message not sent',message);}
    finally{setSending(false);}
  };
  const choosePhoto=async()=>{try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:0.8});if(!result.canceled&&result.assets[0]){const asset=result.assets[0];const type=asset.mimeType||'image/jpeg';const extension=type.split('/')[1]?.replace('jpeg','jpg')||'jpg';setPickedPhoto({uri:asset.uri,name:asset.fileName||`photo-${Date.now()}.${extension}`,type,file:asset.file});}}catch{Alert.alert('Photo unavailable','Please try selecting a photo again.');}};

  if(!user)return null;
  if(isAdmin&&!conversationId)return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/><View style={s.header}><Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={21} color={C.navy}/></Pressable><View style={s.avatar}><Ionicons name="chatbubbles-outline" size={21} color={C.blue}/></View><View style={{flex:1}}><Text style={s.title}>Customer messages</Text><Text style={s.online}>Support conversations</Text></View><Pressable style={s.refresh} onPress={()=>{setLoading(true);void loadConversations();}} accessibilityLabel="Refresh conversations"><Ionicons name="refresh" size={19} color={C.blue}/></Pressable></View>
    {loading?<ActivityIndicator style={{marginTop:28}} color={C.blue}/>:error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text><Pressable style={s.retry} onPress={()=>{setLoading(true);void loadConversations();}}><Text style={s.retryText}>Try again</Text></Pressable></View>:conversations.length===0?<View style={s.empty}><Ionicons name="chatbubble-ellipses-outline" size={34} color={C.muted}/><Text style={s.emptyTitle}>No customer messages yet</Text><Text style={s.emptyText}>Customer chats will appear here when they send their first message.</Text></View>:<ScrollView contentContainerStyle={s.conversationList}>{conversations.map(item=><Pressable key={item.id} style={s.conversationRow} onPress={()=>router.push({pathname:'/chat',params:{conversationId:String(item.id),customerName:item.customer.name}} as never)}><View style={s.avatar}><Ionicons name="person-outline" size={20} color={C.blue}/></View><View style={s.conversationCopy}><Text style={s.conversationName}>{item.customer.name}</Text><Text style={s.conversationPreview} numberOfLines={1}>{item.last_message?.text?`${item.last_message.text.replace(/\s+/g,' ').slice(0,90)}${item.last_message.image||item.last_message.left_face_image||item.last_message.right_face_image?' · 📷':''}`:item.last_message?.image||item.last_message?.left_face_image||item.last_message?.right_face_image?'📷 Photo':'No messages yet'}</Text><Text style={s.conversationTime}>{item.customer.mobile_number}</Text></View>{item.unread_count>0&&<View style={s.unread}><Text style={s.unreadText}>{item.unread_count}</Text></View>}<Ionicons name="chevron-forward" size={18} color={C.muted}/></Pressable>)}</ScrollView>}</SafeAreaView>;

  const customerName=isAdmin?params.customerName||conversations.find(item=>item.id===conversationId)?.customer.name||'Customer chat':'SVBS Admin';
  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg} hidden={!!viewingImage}/><KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}><Pressable style={s.back} onPress={()=>isAdmin?router.replace('/chat' as never):router.back()}><Ionicons name="arrow-back" size={21} color={C.navy}/></Pressable><View style={s.avatar}><Ionicons name={isAdmin?'person-outline':'headset-outline'} size={21} color={C.blue}/></View><View style={{flex:1}}><Text style={s.title}>{customerName}</Text><Text style={s.online}>Customer support · Messages update automatically</Text></View></View>
    {showManualPrompt&&<Animated.View style={[s.manualFlash,{opacity:flashOpacity}]}><Ionicons name="warning-outline" size={18} color="#A61B1B"/><Text style={s.manualFlashText}>Share image of card or type manually</Text></Animated.View>}
    {error!==''&&<View style={s.errorInline}><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>void loadMessages()}><Text style={s.retryText}>Retry</Text></Pressable></View>}
    <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">{loading&&messages.length===0?<ActivityIndicator color={C.blue}/>:messages.length===0?<Text style={s.emptyChat}>Send a message to start the conversation.</Text>:messages.map(message=>{const mine=message.sender_id===user.id;return <View key={message.id} style={[s.bubble,mine?s.mine:s.theirs]}>{message.image&&<Pressable onPress={()=>setViewingImage(message.image)} accessibilityRole="button" accessibilityLabel="View full photo"><Image source={{uri:message.image}} style={s.photo} resizeMode="cover"/></Pressable>}{message.left_face_image&&<View style={s.verificationPhotoWrap}><Text style={[s.verificationPhotoLabel,mine&&s.verificationPhotoLabelMine]}>Left-side face photo</Text><Pressable onPress={()=>setViewingImage(message.left_face_image)} accessibilityRole="button" accessibilityLabel="View full left-side face photo"><Image source={{uri:message.left_face_image}} style={s.photo} resizeMode="cover"/></Pressable></View>}{message.right_face_image&&<View style={s.verificationPhotoWrap}><Text style={[s.verificationPhotoLabel,mine&&s.verificationPhotoLabelMine]}>Right-side face photo</Text><Pressable onPress={()=>setViewingImage(message.right_face_image)} accessibilityRole="button" accessibilityLabel="View full right-side face photo"><Image source={{uri:message.right_face_image}} style={s.photo} resizeMode="cover"/></Pressable></View>}{message.text!==''&&<Text style={[s.message,mine&&s.mineText]}>{message.text}</Text>}<View style={s.receiptRow}><Text style={[s.messageTime,mine&&s.mineTime]}>{new Date(message.created_at).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</Text>{mine&&(()=>{const seen=user.role==='admin'?message.read_by_customer:message.read_by_admin;const delivered=user.role==='admin'?message.delivered_to_customer:message.delivered_to_admin;const receipt=seen?'Seen':delivered?'Delivered':'Sent';return <View style={s.receipt}><Ionicons name={delivered?'checkmark-done':'checkmark'} size={13} color={seen?'#7DDBFF':C.white}/><Text style={[s.receiptText,seen&&s.receiptSeen]}>{receipt}</Text></View>})()}</View></View>})}</ScrollView>
    {peerTyping&&<View style={s.typingIndicator}><View style={s.typingDots}><View style={s.typingDot}/><View style={s.typingDot}/><View style={s.typingDot}/></View><Text style={s.typingText}>{isAdmin?'Customer':'Admin'} is typing…</Text></View>}
    {pickedPhoto&&<View style={s.photoDraft}><Image source={{uri:pickedPhoto.uri}} style={s.photoDraftImage} resizeMode="cover"/><View style={s.photoDraftCopy}><Text style={s.photoDraftName} numberOfLines={1}>{pickedPhoto.name}</Text><Text style={s.photoDraftHint}>Add a caption below, or send the photo alone.</Text></View><Pressable style={s.removePhoto} onPress={()=>setPickedPhoto(null)} disabled={sending} accessibilityLabel="Remove attached photo"><Ionicons name="close" size={19} color={C.navy}/></Pressable></View>}
    <View style={s.composer}><Pressable style={s.photoButton} onPress={()=>void choosePhoto()} disabled={sending} accessibilityLabel="Attach photo"><Ionicons name="image-outline" size={22} color={C.blue}/></Pressable><TextInput style={s.input} value={draft} onChangeText={onDraftChange} onBlur={stopTyping} placeholder={pickedPhoto?"Add a caption...":"Write a message..."} placeholderTextColor="#9AA3B5" multiline/><Pressable style={[s.send,(!draft.trim()&&!pickedPhoto||sending)&&s.disabled]} onPress={()=>void send()} disabled={(!draft.trim()&&!pickedPhoto)||sending} accessibilityLabel="Send message">{sending?<ActivityIndicator size="small" color={C.white}/>:<Ionicons name="arrow-up" size={21} color="white"/>}</Pressable></View><Text style={s.fileNote}>Text and photos only · Maximum photo size 10 MB</Text>
  </KeyboardAvoidingView>
  <Modal visible={!!viewingImage} transparent animationType="fade" onRequestClose={()=>setViewingImage(null)}>
    <View style={s.imageViewer}>
      <Pressable style={s.imageViewerClose} onPress={()=>setViewingImage(null)} accessibilityRole="button" accessibilityLabel="Close photo viewer"><Ionicons name="close" size={27} color={C.white}/></Pressable>
      {viewingImage&&<Image source={{uri:viewingImage}} style={s.fullImage} resizeMode="contain"/>}
    </View>
  </Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},imageViewer:{flex:1,backgroundColor:'#000',alignItems:'center',justifyContent:'center'},imageViewerClose:{position:'absolute',top:Platform.OS==='ios'?54:24,right:18,zIndex:1,width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(35,35,35,0.72)'},fullImage:{width:'100%',height:'100%'},header:{minHeight:64,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border},back:{width:37,height:37,alignItems:'center',justifyContent:'center'},avatar:{width:39,height:39,borderRadius:14,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},title:{fontSize:15,fontWeight:'800',color:C.navy},online:{fontSize:10,color:C.green,marginTop:3},refresh:{width:37,height:37,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},manualFlash:{marginHorizontal:12,marginTop:10,padding:11,borderRadius:12,backgroundColor:'#FFF0EF',borderWidth:1,borderColor:'#E5A5A1',flexDirection:'row',alignItems:'center',gap:8},manualFlashText:{flex:1,fontSize:12,fontWeight:'700',color:'#8E1B15'},typingIndicator:{alignSelf:'flex-start',marginHorizontal:16,marginBottom:7,paddingHorizontal:11,paddingVertical:8,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:7},typingDots:{flexDirection:'row',alignItems:'center',gap:3},typingDot:{width:5,height:5,borderRadius:3,backgroundColor:C.blue},typingText:{fontSize:11,color:C.muted,fontStyle:'italic'},messages:{flex:1},list:{padding:16,gap:10,justifyContent:'flex-end'},bubble:{maxWidth:'84%',padding:11,borderRadius:16},mine:{alignSelf:'flex-end',backgroundColor:C.blue,borderBottomRightRadius:5},theirs:{alignSelf:'flex-start',backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderBottomLeftRadius:5},message:{fontSize:14,lineHeight:20,color:C.navy},mineText:{color:C.white},receiptRow:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:5,marginTop:4},messageTime:{fontSize:9,color:C.muted,textAlign:'right'},receipt:{flexDirection:'row',alignItems:'center',gap:2},receiptText:{fontSize:9,color:C.white,fontWeight:'700'},receiptSeen:{color:'#7DDBFF'},mineTime:{color:'#DCE5FF'},photo:{width:220,height:200,borderRadius:10,marginBottom:0},verificationPhotoWrap:{marginTop:7},verificationPhotoLabel:{fontSize:10,fontWeight:'800',color:C.muted,marginBottom:4},verificationPhotoLabelMine:{color:'#DCE5FF'},photoDraft:{marginHorizontal:12,marginTop:8,marginBottom:5,padding:9,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:10},photoDraftImage:{width:54,height:54,borderRadius:9,backgroundColor:C.pale},photoDraftCopy:{flex:1,minWidth:0},photoDraftName:{fontSize:11,fontWeight:'800',color:C.navy},photoDraftHint:{fontSize:10,color:C.muted,marginTop:4},removePhoto:{width:34,height:34,borderRadius:10,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},composer:{marginHorizontal:12,marginBottom:6,minHeight:54,padding:6,borderRadius:18,backgroundColor:C.white,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:6},photoButton:{width:38,height:38,alignItems:'center',justifyContent:'center'},input:{flex:1,maxHeight:100,minHeight:38,color:C.navy,fontSize:14,paddingHorizontal:6,paddingVertical:8},send:{width:39,height:39,borderRadius:14,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},disabled:{opacity:0.45},fileNote:{textAlign:'center',fontSize:10,color:C.muted,marginBottom:8},conversationList:{padding:14,gap:9},conversationRow:{minHeight:76,padding:12,borderRadius:15,backgroundColor:C.white,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:10},conversationCopy:{flex:1,minWidth:0},conversationName:{fontSize:14,fontWeight:'800',color:C.navy},conversationPreview:{fontSize:12,color:C.muted,marginTop:4},conversationTime:{fontSize:10,color:C.blue,marginTop:4},unread:{minWidth:22,height:22,paddingHorizontal:6,borderRadius:11,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},unreadText:{fontSize:10,fontWeight:'800',color:C.white},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:34,gap:10},emptyTitle:{fontSize:16,fontWeight:'800',color:C.navy},emptyText:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},emptyChat:{fontSize:12,color:C.muted,textAlign:'center',marginTop:24},errorBox:{margin:14,padding:14,borderRadius:14,backgroundColor:'#FFF0EF',gap:10},errorInline:{marginHorizontal:12,marginTop:8,padding:10,borderRadius:10,backgroundColor:'#FFF0EF',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},errorText:{flex:1,fontSize:11,color:'#A12D2A'},retry:{alignSelf:'flex-start',paddingVertical:6,paddingHorizontal:12,borderRadius:8,backgroundColor:C.white},retryText:{fontSize:11,fontWeight:'800',color:C.blue}});
