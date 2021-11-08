const exp = require('express');
const router = exp.Router();
const axios = require('axios');
const { stringify } = require('querystring');

router.use(exp.urlencoded());

    const envio = async(req,res)=>{
        let operador1 = req.body.operador1;
        let operador2 = req.body.operador2;
        let operador = req.body.operando;
        console.log(`parte 3 operador,operador1,operador2 ${operador},${operador1},${operador2}`);
        const data = stringify({
            operador1:operador1,
            operador2:operador2,
            operando:operador
        });
    const resp = await axios.post('http://worker:3002/operacion',data);

    try {
        console.log(resp.data);
        res.json(resp.data).status(200);
    } catch (error) {
        console.log("error en axios parte 3");
    }
    
    }
    router.get('/api/historico',function(req,res){
        res.status(200);
        res.end("historico \n3*2=6");
    });
    router.post('/api/operacion',envio);

    router.use(function (req, res, next) {
        res.status(202);
        res.render('202')
    });

    module.exports = router;