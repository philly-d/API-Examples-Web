import { useState, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient, IAgoraRTCRemoteUser, MicrophoneAudioTrackInitConfig, IMicrophoneAudioTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';

export default function useAgora(client: IAgoraRTCClient | undefined)
  :
   {
      localAudioTrack: ILocalAudioTrack | undefined,
      joinState: boolean,
      leave: Function,
      join: Function,
      remoteUsers: IAgoraRTCRemoteUser[],
    }
    {
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | undefined>(undefined);

  const [joinState, setJoinState] = useState(false);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  async function createLocalTracks(audioConfig?: MicrophoneAudioTrackInitConfig)
  : Promise<IMicrophoneAudioTrack> {
    const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack(audioConfig);
    setLocalAudioTrack(microphoneTrack);
    return microphoneTrack;
  }

  async function join(appid: string, channel: string, token?: string, uid?: string | number | null) {
    if (!client) return;
    const microphoneTrack = await createLocalTracks();
    
    await client.join(appid, channel, token || null);
    await client.publish([microphoneTrack]);

    (window as any).client = client;

    setJoinState(true);
  }

  async function leave() {
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
    }
    setRemoteUsers([]);
    setJoinState(false);
    await client?.leave();
  }

  useEffect(() => {
    if (!client) return;
    setRemoteUsers(client.remoteUsers);

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      // toggle rerender while state of remoteUsers changed.
      setRemoteUsers(remoteUsers => Array.from(client.remoteUsers));
    }
    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(remoteUsers => Array.from(client.remoteUsers));
    }
    const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(remoteUsers => Array.from(client.remoteUsers));
    }
    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(remoteUsers => Array.from(client.remoteUsers));
    }
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-joined', handleUserJoined);
      client.off('user-left', handleUserLeft);
    };
  }, [client]);

  return {
    localAudioTrack,
    joinState,
    leave,
    join,
    remoteUsers,
  };
}