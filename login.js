const express=require('express');
const sqlite3=require('sqlite3')
const {open}=require("sqlite");
const path=require("path")
const cors = require('cors');   //for getting frontend req from port

const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");  //for cookies to store jwt token

const JWT_SECRET = "mysecretkey";   

const app=express();

const dbpath=path.join(__dirname,"log.db")
let db=null;
const initialise=async()=>{
    try{
        db=await open({
          
            filename:dbpath,
            driver:sqlite3.Database
        })
         app.listen(3000,()=>{
            console.log("server is running http://localhost:3000")
         })
    }
    catch(e){
        console.log(`${e}`)
        process.exit(1)
    }
}
initialise()

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json())

app.post('/userreg',async(req,res)=>{
  
  const{username,password,email,contact_number}=req.body;
  const checkuser=`SELECT * FROM user_table WHERE username='${username}'`
  const getuser=await db.get(checkuser)
  if (getuser===undefined){
      const selectQuery=`
      INSERT INTO user_table (username,password,email,contact_number)
      VALUES ('${username}','${password}','${email}','${contact_number}')`
      const created=await db.run(selectQuery);
      res.send(created)
  }else{
    alert("username is already exists")
  }

  }
)


app.delete("/userreg/:contact_number",async(req,res)=>{
 const {contact_number}=req.params;
const Dquery=`
DELETE FROM user_table WHERE contact_number="${contact_number}"`
await db.run(Dquery)
res.send("deleted successfully")
})

// for login check
app.use(cookieParser());
app.post("/login",async(req,res)=>{
    const {username,password}=req.body;
    try {
    const query=`
    SELECT * FROM user_table WHERE username='${username}'`
    const user=await db.get(query);
    console.log(user)
    if (!user || user.password !==password){  // if user is not their or user password also not same
       return res.send("invalid credentails")
    }
    const token=jwt.sign({user_id:user.id,username:user.username},JWT_SECRET,{expiresIn:"30d"}); // create jwt token and addes expire time
    console.log(token)
   
    res.json({ message: "Login successful","token":token ,user});
    console.log(message)
    
  }catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

function authentication(req,res,next){
  const authheader=req.headers["authorization"]
  const token =authheader && authheader.split(" ")[1];
  if(!token){
    res.status(401).json({auth:false,message:"missing token"})
  }
   jwt.verify(token,JWT_SECRET,(err ,decoded)=>{
      if(err){
         return res.status(401).json({auth:false,message:"invalid token"})
      }
    req.user=decoded;
    req.user_id=decoded.user_id
    next()
  })
    
}

app.get('/verify',authentication,(req,res)=>{
      return res.status(200).json({auth:true,user:req.user})
})




app.post("/logout",(req,res)=>{
  res.clearCookie("token",{
       httpOnly: true,
       sameSite: 'Lax', // Or 'None' if using cross-site cookies with HTTPS
       
  });
  })


app.post("/history",async(req,res)=>{
  const {id,user_id,items,total_price,order_date}=req.body
  const history=`
  INSERT INTO user_history(id,user_id,items,total_price,order_date)
  VALUES('${id}','${user_id}','${items}','${total_price}','${order_date}')`
  const createdhistory=await db.run(history)
  res.json(createdhistory)

})

app.get("/userhistory",authentication,async(req,res)=>{
 
  const user_id=req.user_id
  const gethistory=`SELECT * FROM user_history WHERE user_id='${user_id}' ORDER BY order_date DESC`
  const userhistory=await db.all(gethistory)
  res.json(userhistory)
})

app.delete("/userhistory/:user_id",async(req,res)=>{
 const {user_id}=req.params;
const Dquery=`
DELETE FROM user_history WHERE user_id="${user_id}"`
await db.run(Dquery)
res.send("deleted successfully")
})

//====owner table==//
app.post("/owner",async(req,res)=>{
  const {name,email,password}=req.body
  const postquery=`
  INSERT INTO owner_table (name,email,password)
  VALUES('${name}','${email}','${password}')`
  const owner=await db.run(postquery)
  res.json(owner)
})

app.post("/ownerlog",async(req,res)=>{
  const {email,password}=req.body
try{
  const ownerquery=`SELECT * FROM WHERE email='${email}'`
  const owner=await db.get(ownerquery)
  console.log(owner)
  if(!owner && owner.password !== password){
    return res.json("invalid credentail")
  }
  const token =jwt.sign({email:owner.email},JWT_SECRET,{expiresIn:30})
  console.log(token)
  res.send({message:"login succesful","token":token})
  }catch(err){
     res.json("something went wrong"+err.message)
  }
})

function auth(req,res,next){
  const authHead=req.headers['authorization']
  const token=authHead && authHead.split(' ')[1]
  if(!token){
    res.json({auth:false,message:"missing token"})
  }
  jwt.verify(token,JWT_SECRET,(err,decoder)=>{
    if(err){
      res.json({auth:false,message:"invalid token"} )
    }
    req.owner=decoder
    next()
  })


}
app.get('/verify',auth,(req,res)=>{
      return res.status(200).json({auth:true,owner:req.owner})
})

