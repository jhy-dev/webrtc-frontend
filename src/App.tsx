import React, { useEffect, useRef, useState } from 'react';
import { Form, Button, Container, Row, Col, ListGroup } from 'react-bootstrap';

// import { Button, Menu, Breadcrumb, Space, Input } from 'antd';
// import Layout, { Header, Content, Footer } from 'antd/lib/layout/layout';

// import { List, Typography, Divider } from 'antd';

import { io, Socket } from "socket.io-client";



// const { Search } = Input;


enum SignalFlow {
  INIT = "INIT",
  ROOM = "ROOM",
  CANDIDATE = "CANDIDATE",
  OFFER = "OFFER",
  ANSWER = "ANSWER",
  LEAVE = "LEAVE"
}




interface Message {
  room?: string,
  target?: string,
  source?: string,
  candidate?: RTCIceCandidate,
  sdp?: RTCSessionDescriptionInit
}



var target: string;

function App() {


  const socketRef = useRef<Socket>();

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  },
    [local_pc] = useState<RTCPeerConnection>(new RTCPeerConnection(config));


  const [participants, setParticipants] = useState<Array<string>>([]);
  const [num_participants, setNum_participants] = useState(0);
  const [room, setRoom] = useState("");
  // const [target, setTarget] = useState("");

  const onSearch = async () => {
    sendToSignalServer(
      SignalFlow.ROOM,
      {
        room
      })
  }

  const sendToSignalServer = (type: SignalFlow, message: Message) => {
    socketRef.current?.emit(type, message);
  }

  //local pc -> remote pc (call 1/2)
  const makeCall = async (socket_id: string) => {
    target = socket_id;

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
      // console.log(`offer from: ${JSON.stringify(message.source)}`);
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
      // console.log(`answer from: ${JSON.stringify(message.source)}`);
      if (message.sdp) {
        await local_pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
      }
    });

    //icecandidate remote pc -> local pc
    socketRef.current?.on(SignalFlow.CANDIDATE, async (message: Message) => {
      // console.log(`icecandidate from ${message.source}`);
      if (message.sdp) {
        // console.log(`candidate: ${JSON.stringify(message.candidate)}`)
        local_pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    });

    //send icecandidate after creating offer
    //send icecandidate local pc -> remote pc
    local_pc.onicecandidate = async (event) => {
      if (event.candidate) {
        // console.log(`target ${target}`);
        sendToSignalServer(SignalFlow.CANDIDATE, {
          candidate: event.candidate,
          target
        } as Message)
      }
    }

    remoteStream();






  }

  useEffect(() => {

    const socket = (io("34.64.121.181:5000", {
      // path: "/",
      transports: ["websocket"],
      auth: {
        Authorization: "1234"
      },
    }));

    socketRef.current = socket;

    //someone has joined
    socketRef.current?.on(SignalFlow.ROOM, (ev: any) => {
      setNum_participants(ev.number);
      setParticipants(ev.participants);
    })


    startStream();

    // local_pc.onconnectionstatechange = () => {
    //   console.log(local_pc.connectionState);
    // }

    // local_pc.onsignalingstatechange = () => {
    //   console.log(local_pc.signalingState);
    // }


    return () => {
      // local_pc.close();
      // socket.close();
    }
  }, [])

  useEffect(() => {
  }, [participants])




  return (
    <div className="App">
      <Container
        style={{ padding: 100 }}
      >


        <h2>
          {/* Local Video */}
        </h2>
        <Row>
          <video
            width={0}
            id="local_element"
            muted={true}
            autoPlay={true}
            playsInline={true}
          />
        </Row>
        <br />
        <h2>
          {/* Remote Video */}
        </h2>
        <Row>
          <video
            width={0}
            id="remote_element"
            muted={true}
            autoPlay={true}
            playsInline={true}
          // src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
          >
          </video>
        </Row>

        <Row
          style={{ padding: 150 }}
        >
          <Col>
            <Form>
              <Form.Group controlId="formBasicEmail">
                <Form.Label>Room</Form.Label>
                <Form.Control placeholder="Enter Room"
                  onChange={(event: any) => setRoom(event.target.value)}
                />
              </Form.Group>
              <Button
                onClick={() => onSearch()}
                variant="primary" >
                JOIN
  </Button>
            </Form>
          </Col>

        </Row>
        <hr />
        {
          num_participants > 0 ?
            <Row>
              <Col

              >
                <ListGroup as="ul">
                  <ListGroup.Item as="li" active>
                    {num_participants} Participants are in Room: {room}
                  </ListGroup.Item>

                  {
                    participants.map((val, idx) => {
                      return (
                        <ListGroup.Item as="li"
                          key={idx}
                        >
                          {val}
                          <Button
                            onClick={() => makeCall(val)}
                            style={{ marginLeft: 30 }}
                            variant="light">Call</Button>


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


      </Container>

      {/* 
      <Layout className="layout">
        <Header>
          <div className="logo" />
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['2']}>
            <Menu.Item key="1">Home</Menu.Item>
          </Menu>
        </Header>
        <Content style={{ padding: '0 50px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>Room</Breadcrumb.Item>
          </Breadcrumb>

          <Space direction="horizontal">

          </Space>
          <br />
          <br />
          <Space direction="vertical">
            <Search
              placeholder="room number"
              allowClear
              enterButton="Join"
              size="large"
              onSearch={onSearch}
            />
            {
              num_participants > 0 ?
                <React.Fragment>
                  <Divider orientation="left"></Divider>
                  <List
                    header={<div>{num_participants} people are in the {room} (including me)</div>}
                    bordered
                    dataSource={participants}
                    renderItem={item => (
                      <List.Item>
                        {item}<Typography.Text><Button
                          onClick={() => makeCall(item)}
                          type="text" danger
                        >CALL</Button></Typography.Text>
                      </List.Item>
                    )}
                  />
                </React.Fragment>
                :
                <React.Fragment>
                  no participant yet
             </React.Fragment>

            }

          </Space>



        </Content>
        <Footer style={{ textAlign: 'center' }}>Websocket Demo</Footer>
      </Layout> */}



    </div>
  );
}

export default App;



