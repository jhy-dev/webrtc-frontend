
export const MEETING_ROOM = "MEETING_ROOM";

export enum SignalFlow {
  NAME = "NAME",
  ROOM = "ROOM",
  CANDIDATE = "CANDIDATE",
  OFFER = "OFFER",
  ANSWER = "ANSWER",
  LEAVE = "LEAVE"
}

export type RoomParticipantData = {
  name: string,
  socket_id: string
};


export interface Message {
  name?: string,
  room?: string,
  target?: string,
  source?: string,
  candidate?: RTCIceCandidate,
  participants?: RoomParticipantData[],
  sdp?: RTCSessionDescriptionInit
}

export const RTCPeersConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

