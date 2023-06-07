const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleWare
app.use(cors())
app.use(express.json())



















app.get('/', (req,res)=>{
     res.send('Are You Ready to Presente')
})
app.listen(port,()=>{
     console.log(`Presenter : ${port}`);
})