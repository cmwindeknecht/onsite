import { fileURLToPath } from 'url';
import { dirname, resolve, normalize } from 'path';
import { readFileSync } from 'fs';
import {Router} from 'express';
import request from 'request';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const getFiles = filename => {
    const dataFp = normalize(resolve(__dirname, `../data/${filename}`));
    const schemaFp = normalize(resolve(__dirname, `../schemas/${filename}`));

    const data = readFileSync(`${dataFp}.txt`, "utf8");
    const schema= readFileSync(`${schemaFp}.csv`, "utf8");

    return {data, schema}
}

const dataTypes = {
    "TEXT": "string",
    "INTEGER": "number",
    "BOOLEAN": "number"
}

const casteToType = (data, dataType) => {
    if (!(dataType in dataTypes)) throw `Unexcepted dataType ${dataType} in Schema`;

    if (dataType == "TEXT") return String(data);
    else return parseInt(data);   
}

const buildRequest = (schema, data) => {
    return Object.entries(schema).reduce((response, [name, meta]) => {
        response[name] = null;
        const isRequired = meta['is_required'];
        const maxWidth = meta['width'];
        const dataType = meta['datatype'];

        if (!(name in data) && isRequired) {
            throw `Required data not present ${name}`
        } else if (name in data) {
            const value = casteToType(data[name], dataType)
            if (!(typeof value === dataTypes[dataType])) {
                throw `Required datatype for ${name} does not match - ${typeof data[name]} for ${data[name]} with datatype ${dataType}`;
            }
            if (String(data[name]).length > maxWidth) {
                throw `Length of ${name} exceeds max width of ${maxWidth} - ${String(data[name]).length}`;
            }
            response[name] = data[name];
        }
        return response;
      }, {})
}

router.get('/view/:file', (req, res) => {
    try{
        const {data, schema} = getFiles(req.params.file);
        res.json({"data": data, "schema": schema})
    } catch (err) {
        console.log(err)
        res.status(500);
        res.json({fileContent: null, error: true, errorMsg: err})
    }
});

router.get('/execute/:file', (req, res) => {
    try{
        const {data, schema} = getFiles(req.params.file);

        // Format the schema from the text csv
        const schema_formatted = {}
        schema.split("\n").forEach(s => {
            const matches = (new RegExp(/(\w*),(\d*),(\w*)/)).exec(s);
            if (matches) {
                const name = matches[1];
                const width = matches[2];
                const datatype = matches[3];
                schema_formatted[`${name}`] = {width, datatype};
            }
        })
        
        // Send the data based on the schema format
        const postedData = data.split("\n").map(d => {
            const matches = (new RegExp(/(\w*)\s*(\d{4})(\d)(\d\d|\s\d|-\d)/)).exec(d);
            if (matches) {
                const measureId = matches[1];
                const performanceYear = matches[2];
                const isRequired = matches[3];
                const minimumScore = matches[4];

                const measureData = {"measure_id": measureId, "performance_year": performanceYear, "is_required": isRequired, "minimum_score": minimumScore}
                
                const requestData = buildRequest(schema_formatted, measureData)
                request.post(
                    'https://2swdepm0wa.execute-api.us-east-1.amazonaws.com/prod/NavaInterview/measures',
                    requestData
                );
                return requestData;
            }
        }).filter(v => v)

        res.json(postedData)
    } catch (err) {
        console.log(err)
        res.status(500);
        res.json({fileContent: null, error: true, errorMsg: err})
    }
});

export default router;