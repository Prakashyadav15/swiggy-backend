const sqlite3=require("sqlite3").verbose();
const db=new sqlite3.Database("log.db")

db.run(`
    CREATE TABLE IF NOT EXISTS user_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(200),
    password VARCHAR(200),
    email VARCHAR(200),
    contact_number INTEGER

    );`
    ,(err)=>{
        if(err){
            console.log(err.message)
        }
       
   


 db.run(`
    CREATE TABLE IF NOT EXISTS user_history
    (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    items VARCHAR(200),
    total_price REAL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES user_table(id))`,(err)=>{
        if(err){
            console.log(err.message)
        }
        db.close()
    })
 })