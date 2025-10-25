const axios = require('axios');

setTimeout(() => {
  axios.post('http://localhost:3001/api/gametime/login', {
    username: 'annieyang',
    password: 'jc333666'
  }).then(res => {
    console.log('Response:', res.data);
  }).catch(err => {
    console.error('Error:', err.message);
  });
}, 100);
