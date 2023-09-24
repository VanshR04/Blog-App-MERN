const express = require('express')
const app = express()
const cors = require('cors')
const exp = require('constants')
const mongoose = require('mongoose')
const User = require('./models/User')
const Post = require('./models/Post')
const bycrypt = require('bcrypt')
const salt = bycrypt.genSaltSync(10);
const bodyParser = require('body-parser')
const cp = require('cookie-parser')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { userInfo } = require('os')
const multer = require('multer')
const uploadMiddleware = multer({dest : './uploads'})
const secret = 'nhcabfjhnv6w54t67vm54uy'
const fs = require('fs')
const dbURL = "mongodb+srv://(Your Username):(Your Password)@cluster0.xqhhrgl.mongodb.net/Users?retryWrites=true&w=majority"
const connectionParams = {
    useNewUrlParser: true,
}

try{
   mongoose.connect(dbURL, connectionParams).then(() => {
    console.log("Connected to MongoDB")
   })
}
catch(e){
    console.log(e);
}

app.use(cors({credentials : true , origin : 'http://localhost:3000'}))
app.use(express.json())
app.use(express.urlencoded({extended:true}));
app.use(cp())
app.use('/uploads', express.static(__dirname + '/uploads'))




app.post('/register',(req,res) =>{
    const {username,pw} = req.body;    
    console.log(username,pw)
    try
    {var user = new User()
    user.username = username
    user.password = bycrypt.hashSync(pw,salt)
    user.save((err,data) => {
        if(err){
            console.log(err);
        }
        else{
            res.status(200).send('inserted')
            console.log("Data Inserted")
        }
    })}   
    catch(err){
        console.log(err);
    } 
})

app.post('/login' , async (req,res) => {
    const {username,password} = req.body
    console.log(username,password);
    try{
        let result= await User.findOne({username : username});
        if(result){
            if(bycrypt.compareSync(password,result.password)){
                jwt.sign({username,id:result._id},secret,{},(err,token) => {
                    if(err){
                        throw err
                    }
                    else{
                        res.cookie('token', token).json({
                            id : result._id,
                            username : result.username
                        })
                    }
                })
            }
        }
    }
    catch(err){
        res.status(400).json('wrong credentials')
        console.error(err)
    }
})

app.get('/profile' , (req,res) => {
    const {token} = req.cookies
    jwt.verify(token,secret,{},(err,info) => {
        if(err) throw err
        else{
            res.json(info)
            // return info
        }
    })
    res.json(req.cookies)
})

app.post('/logout', (req,res) => {
    res.cookie('token','').json('ok')
})

app.post('/post', uploadMiddleware.single('file') ,async (req,res) => {
    const {originalname , path} = req.file
    const parts = originalname.split('.')
    const ext = parts[parts.length-1]
    const newPath = path + '.' + ext
    fs.renameSync(path, newPath )
    const {token} = req.cookies
    jwt.verify(token,secret,{}, async (err,info) => {
        if(err) throw err


        const {title,summary,content} = req.body
        await Post.create({
        title,
        summary,
        content,
        cover : newPath,
        author : info.id
    })
    // .then(res.status(200).json({'msg' : "data inserted"}))
    .then(console.log('data inserted'))
    res.json(info)
        // return info
    })

    
})

app.get('/post', async (req,res) => {
    const posts = await Post.find()
    .populate('author', ['username'])
    .sort({createdAt : -1})
    .limit(20)
    res.json(posts)
})

app.get('/post/:id',async (req,res) => {
    const {id} = req.params
    const post = await Post.findById(id)
    res.json(post)
})

app.listen(4000, () => {
    console.log("Server Listening on Port 4000...");
})
