# signaling-server

signaling server provides a full work flow to webrtc client for exchanging offer/answer/candidate.

Name convention:
* pc1 -> peer connection which starts to connect another client
* pc2 -> peer connection which receives connection offer to make a connection

## offer & answer
1. pc1 create offer, get self desc, and set as local desc
```javascript
pc1.createOffer(options).then(function(desc){
  pc1.setLocalDescription(desc);
})
```
2. pc2 get pc1's desc, set it as remote desc
```javascript
pc2.setRemoteDescription(desc);
```
3. pc2 create answer, get self desc, and set it as local desc
```javascript
pc2.createAnswer().then(function(desc){
  pc2.setLocalDescription(desc);
})
```
4. pc1 get pc2's desc, set it as remote desc
```javascript
pc1.setRemoteDescription(desc);
```

## candidate
1. pc1 and pc2 get own candidate and exchange
```javascript
pc1.onicecandidate = function(){
  console.log(event.candidate);
}
```
2. pc1 add pc2's candidate and pc2 add pc1's candidate
```javascript
pc1.addIceCandidate(new RTCIceCandidate(candidate));

pc2.addIceCandidate(new RTCIceCandidate(candidate));
```

## Server workflow