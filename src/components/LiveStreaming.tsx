import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Row, Col, ListGroup, FormControl, InputGroup } from 'react-bootstrap';

import { io, Socket } from "socket.io-client";
import { MEETING_ROOM, Message, RoomParticipantData, RTCPeersConfig, SignalFlow } from '../lib/ServerData';





var target: string;

function LiveStreaming() {


    const socketRef = useRef<Socket>();

    const [name, setName] = useState("");
    const [showstreaming, setShowstreaming] = useState(false);

    const [candidates, setCandidates] = useState<RTCIceCandidate[]>([]);
    const [local_pc, setLocal_pc] = useState<RTCPeerConnection>(new RTCPeerConnection(RTCPeersConfig));


    const [participants, setParticipants] = useState<RoomParticipantData[]>([]);


    const enterName = () => {
        console.log(name);
        sendToSignalServer(SignalFlow.NAME, {
            name
        });
        // setShowstreaming(true);
    }

    const sendToSignalServer = (type: SignalFlow, message: Message) => {
        socketRef.current?.emit(type, message);
    }

    //local pc -> remote pc (call 1/2)
    const makeCall = async (socket_id: string) => {
        target = socket_id;;
        // setLocal_pc(new RTCPeerConnection(RTCPeersConfig));
        if (!local_pc.localDescription) {
            const offer = await local_pc.createOffer();
            await local_pc.setLocalDescription(offer!);
        }
        sendToSignalServer(SignalFlow.OFFER, {
            sdp: local_pc.localDescription!,
            target: socket_id
        });
    }



    const remoteStream = () => {
        const remoteStream = new MediaStream();
        const remote_element = document.getElementById('remote_element') as HTMLVideoElement;
        remote_element.srcObject = remoteStream;

        local_pc.ontrack = (ev) => {
            remoteStream.addTrack(ev.track);
        }
    }

    const startStream = async () => {



        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        // local_pc.addTrack(stream.getTracks()[0], stream);
        const local_element = document.getElementById('local_element') as HTMLVideoElement;
        local_element.srcObject = stream;
        local_pc.addTrack(stream.getTracks()[0], stream);

        const offer = await local_pc.createOffer();
        await local_pc.setLocalDescription(offer!);


        //local pc -> remote pc (call 2/2)
        //create answer from remote pc and send it back to local pc
        socketRef.current?.on(SignalFlow.OFFER, async (message: Message) => {
            // setLocal_pc(new RTCPeerConnection(RTCPeersConfig));
            console.log(`offer from: ${JSON.stringify(message.source)}`);
            target = message.source!;
            // console.log(`target ${target}`);
            if (message.sdp) {
                const sdp = new RTCSessionDescription(message.sdp);
                await local_pc.setRemoteDescription(sdp);
                const answer = await local_pc.createAnswer();
                await local_pc.setLocalDescription(answer!);
                sendToSignalServer(SignalFlow.ANSWER, {
                    sdp: answer!,
                    target: message.source
                });
            }
        });

        //remote pc -> local pc (response)
        socketRef.current?.on(SignalFlow.ANSWER, async (message: Message) => {
            console.log(`answer from: ${JSON.stringify(message.source)}`);
            if (message.sdp) {
                await local_pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                candidates.map(candidate => {
                    console.log(`sending ice_candidate to target: ${target}`);
                    return sendToSignalServer(SignalFlow.CANDIDATE, {
                        candidate,
                        target
                    } as Message);
                });
            }
        });

        //icecandidate remote pc -> local pc
        socketRef.current?.on(SignalFlow.CANDIDATE, async (message: Message) => {
            console.log(`icecandidate from ${message.source}`);
            if (message.sdp) {
                console.log(`adding candidate: ${JSON.stringify(message.candidate)}...`)
                local_pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        });

        //send icecandidate after creating offer
        //send icecandidate local pc -> remote pc
        local_pc.onicecandidate = async (event) => {
            if (event.candidate) {
                if (target) {
                    console.log(`sending ice_candidate to target: ${target}`);
                    sendToSignalServer(SignalFlow.CANDIDATE, {
                        candidate: event.candidate,
                        target
                    } as Message)
                } else {
                    setCandidates(oldArray => [...oldArray, event.candidate!]);

                }
            }
        }

        remoteStream();


    }

    useEffect(() => {
        const socket = (io("ws://172.30.1.10:5000", {
            // path: "/",
            transports: ["websocket"],
            auth: {
                Authorization: "Bearer token_here"
            },
        }));

        socketRef.current = socket;

        socketRef.current?.on(SignalFlow.NAME, async (message: Message) => {
            let name = message.name!;
            if (name) {
                setShowstreaming(true);
            } else {
                alert("name already exists");
            }
        });

        //someone has joined
        socketRef.current?.on(MEETING_ROOM, (ev: any) => {
            setParticipants(ev.participants);
        })

    }, [])

    useEffect(() => {

        if (showstreaming) {

            sendToSignalServer(
                SignalFlow.ROOM,
                {});


            startStream();

            local_pc.onconnectionstatechange = () => {
                console.log(local_pc.connectionState);
            }

            local_pc.onsignalingstatechange = () => {
                console.log(local_pc.signalingState);
            }

        }
    }, [showstreaming])

    useEffect(() => {
    }, [participants])




    return (
        <div className="App">

            {
                showstreaming ?
                    <Container
                        style={{ padding: 100 }}
                    >




                        <h2>
                            Local Video
    </h2>
                        <Row>
                            <video
                                width={300}
                                id="local_element"
                                muted={true}
                                autoPlay={true}
                                playsInline={true}
                            />
                        </Row>
                        <br />
                        <h2>
                            Remote Video
    </h2>
                        <Row>
                            <video
                                width={300}
                                id="remote_element"
                                muted={true}
                                autoPlay={true}
                                playsInline={true}
                            >
                            </video>
                        </Row>

                        <hr />
                        {
                            participants.length > 0 ?
                                <Row>
                                    <Col

                                    >
                                        <ListGroup as="ul">
                                            <ListGroup.Item as="li" active>
                                                {participants.length} Participants are in Room
                        </ListGroup.Item>

                                            {
                                                participants.map((val, idx) => {
                                                    return (
                                                        <ListGroup.Item as="li"
                                                            key={idx}
                                                        >
                                                            {val.name}
                                                            {
                                                                val.name !== name &&
                                                                <Button
                                                                    onClick={() => makeCall(val.socket_id)}
                                                                    style={{ marginLeft: 30 }}
                                                                    variant="light">Call</Button>
                                                            }


                                                        </ListGroup.Item>
                                                    )
                                                }


                                                )
                                            }

                                        </ListGroup>
                                    </Col>

                                </Row>
                                :
                                <React.Fragment>
                                    No Participant yet
</React.Fragment>
                        }


                    </Container> :
                    <Container
                        style={{ padding: 100 }}
                    >
                        <h2>
                            My Name
                </h2>

                        <InputGroup className="mb-3">
                            <FormControl
                                placeholder="Enter Name"
                                aria-describedby="basic-addon2"
                                onChange={(event) => { setName(event.target.value) }}
                            />
                            <InputGroup.Append>
                                <Button
                                    onClick={() => enterName()}
                                    variant="outline-secondary">Enter</Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Container>



            }



        </div>
    );
}

export default LiveStreaming;






