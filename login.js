const express=require('express');
const sqlite3=require('sqlite3')
const {open}=require("sqlite");
const path=require("path")
const cors = require('cors');   //for getting frontend req from port

const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");  //for cookies to store jwt token

const JWT_SECRET = "mysecretkey";   

const app=express();

const dbpath=path.join(__dirname,"login.db")
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
  const selectQuery=`
  INSERT INTO user_login (username,password,email,contact_number)
  VALUES ('${username}','${password}','${email}','${contact_number}')`
  const created=await db.run(selectQuery);
  res.send(created)
  }
)


app.delete("/userreg/:contact_number",async(req,res)=>{
 const {contact_number}=req.params;
const Dquery=`
DELETE FROM user_login WHERE contact_number="${contact_number}"`
await db.run(Dquery)
res.send("deleted successfully")
})

// for login check
app.use(cookieParser());
app.post("/login",async(req,res)=>{
    const {username,password}=req.body;
    const query=`
    SELECT * FROM user_login WHERE username=?`
    const user=await db.get(query,[username]);
    if (!user || user.password !==password){  // if user is not their or user password also not same
       return res.send("invalid credentails")
    }
    const token=jwt.sign({username:user.username},JWT_SECRET,{expiresIn:"30d"}); // create jwt token and addes expire time
   
    // res.cookie("token",token, {
    //   httpOnly: true,        //Prevents JavaScript from reading the cookie
    //   sameSite: "Lax"        //	Prevents some CSRF attacks
    // })
    res.send({ message: "Login successful","token":token });
});


app.get('/verify-token',(req,res)=>{
     const token =req.cookies.token
     if(!token){
      return res.status(401).json({auth:false})
     }
     jwt.verify(token,JWT_SECRET,(err ,decoded)=>{
      if(err){
         return res.status(401).json({auth:false})
      }
      return res.status(200).json({auth:true,username:decoded.username})
     })


})

app.post("/logout",(req,res)=>{
  res.clearCookie("token",{
       httpOnly: true,
       sameSite: 'Lax', // Or 'None' if using cross-site cookies with HTTPS
       
  });
  })

