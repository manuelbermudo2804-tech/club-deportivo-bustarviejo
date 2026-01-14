import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSoundNotifications } from './useSoundNotifications';

export default function ChatSoundNotifier({ user, chatType = 'all' }) {
  const [coordConvs, setCoordConvs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminConvs, setAdminConvs] = useState([]);
  const [staffMessages, setStaffMessages] = useState([]);
  const [coordMessages, setCoordMessages] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Coordinator conversations + messages
    if (chatType === 'all' || chatType === 'coordinator') {
      const loadCoord = async () => {
        const convs = await base44.entities.CoordinatorConversation.list('-updated_date', 100);
        setCoordConvs(convs);
        const msgs = await base44.entities.CoordinatorMessage.list('-created_date', 100);
        setCoordMessages(msgs);
      };
      loadCoord();

      const unsubConv = base44.entities.CoordinatorConversation.subscribe((event) => {
        if (event.type === 'create') setCoordConvs(prev => [event.data, ...prev]);
        else if (event.type === 'update') setCoordConvs(prev => prev.map(c => c.id === event.id ? event.data : c));
        else if (event.type === 'delete') setCoordConvs(prev => prev.filter(c => c.id !== event.id));
      });
      unsubscribers.push(unsubConv);

      const unsubMsg = base44.entities.CoordinatorMessage.subscribe((event) => {
        if (event.type === 'create') setCoordMessages(prev => [event.data, ...prev]);
        else if (event.type === 'update') setCoordMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setCoordMessages(prev => prev.filter(m => m.id !== event.id));
      });
      unsubscribers.push(unsubMsg);
    }

    // Coach messages
    if (chatType === 'all' || chatType === 'coach') {
      const loadChat = async () => {
        const messages = await base44.entities.ChatMessage.list('-created_date', 100);
        setChatMessages(messages);
      };
      loadChat();

      const unsub = base44.entities.ChatMessage.subscribe((event) => {
        if (event.type === 'create') setChatMessages(prev => [event.data, ...prev]);
        else if (event.type === 'update') setChatMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setChatMessages(prev => prev.filter(m => m.id !== event.id));
      });
      unsubscribers.push(unsub);
    }

    // Admin conversations + messages
    if (chatType === 'all' || chatType === 'admin') {
      const loadAdmin = async () => {
        const convs = await base44.entities.AdminConversation.list('-updated_date', 100);
        setAdminConvs(convs);
        const msgs = await base44.entities.AdminMessage.list('-created_date', 100);
        setAdminMessages(msgs);
      };
      loadAdmin();

      const unsubConv = base44.entities.AdminConversation.subscribe((event) => {
        if (event.type === 'create') setAdminConvs(prev => [event.data, ...prev]);
        else if (event.type === 'update') setAdminConvs(prev => prev.map(c => c.id === event.id ? event.data : c));
        else if (event.type === 'delete') setAdminConvs(prev => prev.filter(c => c.id !== event.id));
      });
      unsubscribers.push(unsubConv);

      const unsubMsg = base44.entities.AdminMessage.subscribe((event) => {
        if (event.type === 'create') setAdminMessages(prev => [event.data, ...prev]);
        else if (event.type === 'update') setAdminMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setAdminMessages(prev => prev.filter(m => m.id !== event.id));
      });
      unsubscribers.push(unsubMsg);
    }

    // Staff messages
    if (chatType === 'all' || chatType === 'staff') {
      const loadStaff = async () => {
        const messages = await base44.entities.StaffMessage.list('-created_date', 100);
        setStaffMessages(messages);
      };
      loadStaff();

      const unsub = base44.entities.StaffMessage.subscribe((event) => {
        if (event.type === 'create') setStaffMessages(prev => [event.data, ...prev]);
        else if (event.type === 'update') setStaffMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setStaffMessages(prev => prev.filter(m => m.id !== event.id));
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, chatType]);

  const { checkForNewItems: checkCoord } = useSoundNotifications({
    dataKey: 'chat-coordinator-rt',
    enabled: true,
    filter: (item) => true
  });

  const { checkForNewItems: checkCoordMsg } = useSoundNotifications({
    dataKey: 'chat-coordinator-msg-rt',
    enabled: true,
    filter: () => true
  });

  const { checkForNewItems: checkChat } = useSoundNotifications({
    dataKey: 'chat-coach-rt',
    enabled: true,
    filter: (item) => !item.leido_por?.some(l => l.email === user?.email)
  });

  const { checkForNewItems: checkAdmin } = useSoundNotifications({
    dataKey: 'chat-admin-rt',
    enabled: true,
    filter: () => true
  });

  const { checkForNewItems: checkAdminMsg } = useSoundNotifications({
    dataKey: 'chat-admin-msg-rt',
    enabled: true,
    filter: () => true
  });

  const { checkForNewItems: checkStaff } = useSoundNotifications({
    dataKey: 'chat-staff-rt',
    enabled: true,
    filter: (item) => !item.leido_por?.some(l => l.email === user?.email)
  });

  useEffect(() => {
    if (coordConvs.length > 0) checkCoord(coordConvs);
  }, [coordConvs, checkCoord]);

  useEffect(() => {
    if (coordMessages.length > 0) checkCoordMsg(coordMessages);
  }, [coordMessages, checkCoordMsg]);

  useEffect(() => {
    if (chatMessages.length > 0) checkChat(chatMessages);
  }, [chatMessages, checkChat]);

  useEffect(() => {
    if (adminConvs.length > 0) checkAdmin(adminConvs);
  }, [adminConvs, checkAdmin]);

  useEffect(() => {
    if (adminMessages.length > 0) checkAdminMsg(adminMessages);
  }, [adminMessages, checkAdminMsg]);

  useEffect(() => {
    if (staffMessages.length > 0) checkStaff(staffMessages);
  }, [staffMessages, checkStaff]);

  return null;
}