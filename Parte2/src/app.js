
const { urlencoded } = require('express');
var express = require('express');
var path = require('path');
var axios = require('axios');
const { stringify } = require('querystring');
var app = express();
var redis = require('redis');

const redisCliente = redis.createClient({
    host:"redis",port:6379,retry_strategy:()=>1000
});

app.use(express.static('public'));
app.use(urlencoded());

app.set('views', path.join(__dirname, './views'));
app.set('view engine', "ejs");

app.get('/historial',async(req,res)=>{
    let datos;
    datos = await getHistorial();
    res.status(201);
    res.render('historial',{resultado:datos});
});

app.get('/', function (req, res) {
    res.status(201);
    res.render('login',{resultado:"Bienvenido al super calculadora"})
});


app.post('/registro',async (req,res)=>{
    const{user,password} = req.body;
    try {
        if(redisCliente.exists(user,(noExiste,existe)=>{
            if(existe){
                res.render('registro',{resultado:"Usuario no creado"});
            }else{
                crear(user,password);
                res.render("calculadora",{resultado:"Bienvenido al sistema",operador1:"",operador2:""});
            }
        }));
    } catch (error) {
        res.render('registro',{resultado:"erro al crear"});
    }
});

app.get('/registro',(req,res)=>{
    res.status(201);
    res.render('registro',{resultado:"Bienvenido al sistema"});
});

app.get('/calculadora',(req,res)=>{
    res.status(201);
    res.render("calculadora",{resultado:"Bienvenido al sistema",operador1:"",operador2:""});
});

app.post('/',async function(req,res){
    const {user,password} = req.body;
    let userlog;
    try{
        userlog = await getUsario(user);
    }catch(error){
        res.status(201);
        res.render('login',{resultado:"Usuario o password incorrectos"});
    }
    if(!userlog){
        res.status(201);
        res.render('login',{resultado:"Usuario o password incorrectos"});
    }else{
        if(userlog.password == password){
            res.status(201);
            res.render("calculadora",{
                resultado:"Bienvenido "+user+" al sistema",
                operador1:"",
                operador2:""
            });
        }else{
            res.status(201);
            res.render('login',{resultado:"Usuario o password incorrectos"});
        }
    }
});

app.get('/acercaDe', function (req, res) {
    res.status(201);
    res.render("acercaDe");
});

app.post('/operar',async (req,res) => {
    console.log(req.body.entrada1);
    let entrada1 = Number.parseFloat(req.body.entrada1);
    let entrada2 = Number.parseFloat(req.body.entrada2);
    let operador = req.body.opcionOperacion;
    console.log("parte 2    operador, op1, op2:        "+operador+", "+entrada1+", "+entrada2);

    let data = stringify({
        operador1:entrada1,
        operador2:entrada2,
        operando:operador
    });
    
    const resp = await axios.post('http://api:3001/api/operacion',data);
    try {
        agregarHistorial(operador,entrada1,entrada2,resp.data.resultado);
        res.render('calculadora',{
            resultado:"Resultado ("+operador+"): "+resp.data.resultado,
            operador1:entrada1,
            operador2:entrada2
        });
    } catch (error) {
        console.log("error en axios : "+error);
    }
});

app.use(function (req, res, next) {
    res.status(404);
    res.render('404')
});

app.listen(3000, function () {
    console.log('servidor en puerto 3000');
});


function existenciaUsuario(user){
    return new Promise ((resolve,reject)=>{
        redisCliente.exists(user,function(error,exist){
            if(exist){
                return true;
            }else{
                return false;
            }
        });
    });
}

function crear(user,password){
    console.log("Registro de cliente,passwor:    "+user+","+password);
    return new Promise((resolve,reject)=>{
        console.log("cliente creado");
        resolve(redisCliente.hset(user,'password',password));
    });
}

function getUsario (user) {
    return new Promise((resolve,reject)=>{        
        redisCliente.hgetall(user,(error,exist)=>{
            if(error){
                reject(0);
            }else{
                resolve(exist);
            }
        });
    });
}
function agregarHistorial(operador,operador1,operador2,resultadoop){
    let datos1 = operador+"."+operador1+"."+operador2+"."+resultadoop;
    return new Promise((resolve,reject)=>{
        console.log("historial agregado: "+datos1);
        resolve(redisCliente.lpush('historial',datos1));
    });
}

function getHistorial(){
    return new Promise((resolve,reject)=>{        
        redisCliente.lrange("historial",0,20,(error,exist)=>{
            if(error){
                reject(0);
            }else{
                resolve(exist);
            }
        });
    });
}