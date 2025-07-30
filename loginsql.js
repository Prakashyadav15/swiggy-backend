const sqlite3=require("sqlite3").verbose();
const db=new sqlite3.Database("login.db")

db.run(`
    CREATE TABLE IF NOT EXISTS user_login (
    username VARCHAR(200),
    password VARCHAR(200),
    email VARCHAR(200),
    contact_number INTEGER

    );`
    ,(err)=>{
        if(err){
            console.log(err.message)
        }
        else{
            db.close()
        }
    }

)


db.run