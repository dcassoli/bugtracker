const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const sgMail = require('@sendgrid/mail');

const GoogleSpreadsheet = require('google-spreadsheet');
const credentials = require('./bugtracker.json');

// Configurações Planilha google
const docId = 'XXXXX';
const worksheetIndex = 0;
const sendGridKey = 'XXXXX';

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/img', express.static(__dirname + '/img'));
app.use('/css', express.static(__dirname + '/css'));

app.get('/', (request, response) => {
    response.render('home')
});

app.post('/', async(request, response) => {
    try {
        const doc = new GoogleSpreadsheet(docId);
        await promisify(doc.useServiceAccountAuth)(credentials);

        const info = await promisify(doc.getInfo)();
        const worksheet = info.worksheets[worksheetIndex];
        await promisify(worksheet.addRow)({
            name: request.body.name, 
            'e-mail': request.body.email,
            'Classificação': request.body.issueType,
            'Como reproduzir o erro': request.body.howToReproduce,
            'Saída esperada': request.body.expectedOutput,
            'Saída recebida': request.body.receivedOutput,
            userAgent: request.body.userAgent,
            userDate: request.body.userDate,
            source: request.query.source || 'direto'
        });
        
        //Se for critico
        if (request.body.issueType === "Crítico") {
            sgMail.setApiKey(sendGridKey);
            const msg = {
              to: 'dcassoli@gmail.com',
              from: 'dcassoli@gmail.com',
              subject: '[BugTracker] Bug Crítico reportado',
              text: `
                O usuário ${request.body.name} reportou um erro crítico
              `,
              html: `<strong>O usuário ${request.body.name} reportou um erro crítico</strong>`,
            };
            await sgMail.send(msg);
        }

        response.render('sucesso');
    } catch (err) {
        response.send('Erro ao enviar o formulário.');
        console.log(err);
    }
});


app.listen(3000, (err) => {
    if (err) {
        console.log('Aconteceu um erro:', err)
    } else {
        console.log('BugTracker rodando na porta 3000')
    }
});
