const exp = require('express');
const router = exp.Router();

router.use(exp.urlencoded());

router.post('/operacion',(req,res)=>{
    let tipo = req.body.operando;
    let operador1 = Number.parseFloat(req.body.operador1);
    let operador2 = Number.parseFloat(req.body.operador2);
    let resultado = 0;
    console.log("operador, op1, op2:        "+tipo+", "+operador1+", "+operador2);
    switch (tipo){
        case "suma":
        resultado = operador1 + operador2;
        break;
        case "resta":
        resultado = operador1 - operador2;
        break;
        case "multiplicacion":
        resultado = operador1 * operador2;
        break;
        case "division":
        resultado = operador1 / operador2;
        break;
        case "potencia":
        resultado = Math.pow(operador1,operador2);
        break;
    }
    res.json({resultado:resultado}).status(200);
});

module.exports = router;