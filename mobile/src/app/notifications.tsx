import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NOTIFICATIONS_API_URL } from '@/constants/api';
import { useAuthUser } from '@/lib/auth-session';
import { setUnreadNotificationCount } from '@/lib/notification-state';

const C={navy:'#102344',blue:'#3563E9',bg:'#F5F7FC',white:'#FFFFFF',muted:'#7C879B',border:'#E2E7F0',pale:'#E9EFFF'};
type AppNotification={id:number;kind:'announcement'|'chat';title:string;body:string;route:string;created_at:string;read_at:string|null};

export default function NotificationsScreen(){
 const user=useAuthUser();
 const authToken=user?.token;
 const[items,setItems]=useState<AppNotification[]>([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const[marking,setMarking]=useState(false);
 const load=useCallback(async()=>{
  if(!authToken){setLoading(false);return}
  try{
   const response=await fetch(NOTIFICATIONS_API_URL,{headers:{Accept:'application/json',Authorization:`Bearer ${authToken}`}});
   if(!response.ok)throw new Error(`Could not load notifications (${response.status}).`);
   const result=await response.json() as {unread_count:number;results:AppNotification[]};
   setItems(Array.isArray(result.results)?result.results:[]);setUnreadNotificationCount(result.unread_count||0);setError('');
   if(result.unread_count>0){
    setMarking(true);
    const marked=await fetch(NOTIFICATIONS_API_URL,{method:'POST',headers:{Accept:'application/json',Authorization:`Bearer ${authToken}`}});
    if(marked.ok){const seenAt=new Date().toISOString();setItems(current=>current.map(item=>({...item,read_at:item.read_at||seenAt})));setUnreadNotificationCount(0)}
   }
  }catch(e){setError(e instanceof Error?e.message:'Could not load notifications. Check your connection.')}
  finally{setLoading(false);setMarking(false)}
 },[authToken]);
 useEffect(()=>{const initial=setTimeout(()=>void load(),0);return()=>clearTimeout(initial)},[load]);
 return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/><ScrollView contentContainerStyle={s.page}>
  <Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={22} color={C.navy}/></Pressable>
  <Text style={s.kicker}>YOUR ACCOUNT</Text><Text style={s.title}>Notifications</Text><Text style={s.sub}>Announcements and messages from SVBS.</Text>
  {loading?<View style={s.state}><ActivityIndicator color={C.blue}/><Text style={s.body}>Loading notifications…</Text></View>:error?<View style={s.state}><Text style={s.body}>{error}</Text><Pressable onPress={()=>{setLoading(true);void load()}}><Text style={s.retry}>Retry</Text></Pressable></View>:items.length===0?<View style={s.state}><Ionicons name="notifications-off-outline" size={25} color={C.muted}/><Text style={s.body}>You’re all caught up. New SVBS announcements and admin messages will appear here.</Text></View>:items.map(item=><Pressable key={item.id} style={[s.item,!item.read_at&&s.unread]} onPress={()=>{if(item.kind==='chat')router.push(item.route as never)}} accessibilityRole={item.kind==='chat'?'button':undefined}>
    <View style={s.icon}><Ionicons name={item.kind==='announcement'?'megaphone-outline':'chatbubble-ellipses-outline'} size={21} color={C.blue}/></View>
    <View style={{flex:1}}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.body}>{item.body||'New update from SVBS.'}</Text><Text style={s.time}>{new Date(item.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</Text></View>
   </Pressable>)}
   {marking&&<Text style={s.note}>Marking notifications as read…</Text>}
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},page:{padding:22,paddingTop:14,paddingBottom:30},back:{width:43,height:43,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',marginBottom:25},kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.3,color:C.blue},title:{fontSize:30,fontWeight:'800',color:C.navy,marginTop:8},sub:{fontSize:14,color:C.muted,marginTop:6,marginBottom:22},item:{flexDirection:'row',gap:13,padding:15,backgroundColor:C.white,borderColor:C.border,borderWidth:1,borderRadius:17,marginBottom:12},unread:{borderColor:C.blue,backgroundColor:'#F7F9FF'},icon:{width:43,height:43,borderRadius:13,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},itemTitle:{fontSize:14,fontWeight:'800',color:C.navy},body:{fontSize:12,color:C.muted,lineHeight:18,marginTop:5},time:{fontSize:10,fontWeight:'700',color:C.blue,marginTop:8},state:{gap:10,padding:18,alignItems:'center',backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:15},retry:{fontSize:13,fontWeight:'800',color:C.blue},note:{fontSize:11,color:C.muted,textAlign:'center',marginTop:10}});
