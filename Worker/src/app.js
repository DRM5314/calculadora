const ex = require('express');
const routes = require('./routes/routes');
const app = ex();

app.use(routes);

app.listen(3002,function(){
    console.log("worker en puerto 3002");
});