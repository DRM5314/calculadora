const express = require ('express');
const routes = require('./routes/routes');
const app = express();

app.use(routes);

app.listen(3001,function(){
    console.log("servidor api en puerto 3001");
});