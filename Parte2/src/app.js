//importaciones
const { urlencoded } = require('express');
var express = require('express');
var path = require('path');
var axios = require('axios');
const { stringify } = require('querystring');
var app = express();


//Para el uso de redis
var redis = require('redis');
const redisCliente = redis.createClient({
    host: "redis", port: 6379, retry_strategy: () => 1000
});


//Para el uso de Web token
const webToken = require('jsonwebtoken');
const tokenSecreto = "carlitos12";
const crypto = require('crypto');

//Para el uso de tokenStorage
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./scratch');
//configuraciones nodejs
app.use(express.static('public'));
app.use(urlencoded());

app.set('views', path.join(__dirname, './views'));
app.set('view engine', "ejs");




//rutas para el usuario logeado
app.get('/historial',checkToken, async (req, res) => {
    let datos;
    datos = await getHistorial();
    res.status(201);
    res.render('historial', { resultado: datos });
});

app.get('/calculadora',checkToken,(req, res) => {
    res.status(201);
    res.render("calculadora", { resultado: "Bienvenido al sistema", operador1: "", operador2: "" });
});




//rutas de inicio (logeo)
app.get('/', function (req, res) {
    localStorage.removeItem('token');
    res.status(201);
    res.render('login', { resultado: "Bienvenido al super calculadora" })
});

app.post('/registro', async (req, res) => {
    const { user, password } = req.body;
    try {
        if (redisCliente.exists(user, (noExiste, existe) => {
            if (existe) {
                res.render('registro', { resultado: "Usuario no creado" });
            } else {
                crypto.randomBytes(16, (err, salt) => {
                    const newSalt = salt.toString('base64');
                    console.log(`newSalt: ${newSalt}`);
                    crypto.pbkdf2(password, newSalt, 1000, 64, 'sha1', async (err, key) => {
                        const encryptedPass = key.toString('base64');
                        try {
                            await crear(user, encryptedPass, newSalt);
                            const token = inicioToken(user);
                            localStorage.setItem('token', token);
                            res.render("calculadora", { resultado: "Bienvenido al sistema", operador1: "", operador2: "" });
                        } catch (err) {
                            console.error(err);
                            res.status(503).json({ succes: 'Error al guardar el usuario' });
                        }
                    });
                });
            }
        }));
    } catch (error) {
        res.render('registro', { resultado: "erro al crear (Posible usuario repetido)" });
    }
});

app.get('/registro', (req, res) => {
    res.status(201);
    res.render('registro', { resultado: "Bienvenido al sistema" });
});

app.post('/', async function (req, res) {
    const { user, password } = req.body;
    let userlog;
    try {
        userlog = await getUsario(user);
    } catch (error) {
        res.status(201);
        res.render('login', { resultado: "Usuario o password incorrectos" });
    }
    if (!userlog) {
        res.status(201);
        res.render('login', { resultado: "Usuario o password incorrectos" });
    } else {
        crypto.pbkdf2(password, userlog.salt, 1000, 64, 'sha1', (err, key) => {
            const encryptedPass = key.toString('base64');
            if (userlog.password === encryptedPass) {
                const token = inicioToken(user);
                localStorage.setItem('token', token);
                res.status(201);
                res.render("calculadora", {
                    resultado: "Bienvenido " + user + " al sistema",
                    operador1: "",
                    operador2: ""
                });
            }
            else {
                res.status(201);
                res.render('login', { resultado: "Usuario o password incorrectos" });
            }
        });
    }
});

app.get('/acercaDe', function (req, res) {
    res.status(201);
    res.render("acercaDe");
});





//rutas de operacion
app.post('/operar',async (req, res) => {
    console.log(req.body.entrada1);
    let entrada1 = Number.parseFloat(req.body.entrada1);
    let entrada2 = Number.parseFloat(req.body.entrada2);
    let operador = req.body.opcionOperacion;
    console.log("parte 2    operador, op1, op2:        " + operador + ", " + entrada1 + ", " + entrada2);

    let data = stringify({
        operador1: entrada1,
        operador2: entrada2,
        operando: operador
    });

    const resp = await axios.post('http://api:3001/api/operacion', data);
    try {
        agregarHistorial(operador, entrada1, entrada2, resp.data.resultado);
        res.render('calculadora', {
            resultado: "Resultado (" + operador + "): " + resp.data.resultado,
            operador1: entrada1,
            operador2: entrada2
        });
    } catch (error) {
        console.log("error en axios : " + error);
    }
});


//ruta de escape al no existir ruta
app.use(function (req, res, next) {
    res.status(404);
    res.render('404')
});

app.listen(3000, function () {
    console.log('servidor en puerto 3000');
});

//funciones para creacion y loegeo de usuario
function existenciaUsuario(user) {
    return new Promise((resolve, reject) => {
        redisCliente.exists(user, (erro, exist) => {
            if (erro) {
                reject(0);
            } else {
                resolve(exist);
            }
        });
    });
}

function crear(user, password, newsalt) {
    console.log("Registro de cliente,passwor:    " + user + "," + password);
    return new Promise((resolve, reject) => {
        console.log("cliente creado");
        resolve(redisCliente.hset(user, 'password', password, 'salt', newsalt));
    });
}

function getUsario(user) {
    return new Promise((resolve, reject) => {
        redisCliente.hgetall(user, (error, exist) => {
            if (error) {
                reject(0);
            } else {
                resolve(exist);
            }
        });
    });
}


//funciones para historial de operaciones
function agregarHistorial(operador, operador1, operador2, resultadoop) {
    let datos1 = operador + "." + operador1 + "." + operador2 + "." + resultadoop;
    return new Promise((resolve, reject) => {
        console.log("historial agregado: " + datos1);
        resolve(redisCliente.lpush('historial', datos1));
    });
}

function getHistorial() {
    return new Promise((resolve, reject) => {
        redisCliente.lrange("historial", 0, 20, (error, exist) => {
            if (error) {
                reject(0);
            } else {
                resolve(exist);
            }
        });
    });
}


//funciones para Webtoken

function inicioToken(id) {
    return webToken.sign({ id }, tokenSecreto, {
        expiresIn: 2700
    });
}

async function checkToken(req, res, next) {
    const token = localStorage.getItem('token');
    if (!token) {
        return res.sendStatus(403).json({error: 'Token no existe'});
    }
    webToken.verify(token, tokenSecreto, async (err, decoded) => {
        if (decoded) {
            const { id } = decoded;
            let existe = await existenciaUsuario(id);
            if (existe !== 0) {
                req.user = id;
                next();
            } else {
                res.status(403).json({ error: 'Usuario no existe' });
            }
        } else {
            res.status(403).json({ error: 'decode no existe' });
        }
    });
}