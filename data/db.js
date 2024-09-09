const mysql=require("mysql");
const db=mysql.createConnection({
    host: "localhost",
    user: "root",
    password:"",
    database:"arkas"
});


db.connect((err) =>{
    if(err) {
        console.error("bağlantı başarısız",err);
        return;
    }
    console.log("mysql bağlantısı başarılı");

});

module.exports=db;