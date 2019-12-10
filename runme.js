const sql = require('mssql');
const moment = require("moment");
let now = moment();
let today = now.format("MM/DD/YYYY");


const config = {
  user: 'test',
  password: 'test',
  server: 'test',
  database: 'test'
}

let mainPool = new sql.ConnectionPool(config);
let mainPoolConnect = mainPool.connect();

mainPool.on("error", err => {
  console.log(err);  
});

async function DispatchCreateRun() {
  await mainPoolConnect; //checks if pool is connected
  console.log('connected');
  try {
    let req = mainPool.request();
    let results = await req.query("select * from mrspcl where SPECIAL_NO in ('167203')");
    if (results.rowsAffected > 0) {  
        try {
            for (let i = 0; i < results.recordset.length; i++) {
                console.log(results.recordset[i].SPECIAL_NO);
                let result2 = await req.query(`INSERT INTO DISPATCH_NO (REF_ID) Values (${results.recordset[i].SPECIAL_NO}) ;SELECT CAST(scope_identity() AS int) as dispatch_no;`);
                if (result2.rowsAffected) {
                    console.log(result2.recordset[0].dispatch_no);
                    let req = mainPool.request();
                    req.input("dispatch_no", sql.Int, result2.recordset[0].dispatch_no);
                    req.input("specialno",sql.VarChar, results.recordset[i].SPECIAL_NO);
                    req.input("cust_id",sql.VarChar, results.recordset[i].CUST_ID);
                    req.input("loc_id",sql.VarChar, results.recordset[i].LOC_ID);
                    req.input("work_type",sql.VarChar, "SP");
                    req.input("sp_type",sql.VarChar, results.recordset[i].SPCL_TYPE);
                    req.input("cstamp", sql.VarChar, `SMURATOV${moment().format("YYYYMMDD")}`);
                    try {
                        let SaveDispatch = await req.execute("[dbo].[uspSaveDispatch]");                        
                        if (SaveDispatch) {
                            let req = mainPool.request();
                            req.input("ref_id",sql.VarChar, results.recordset[i].SPECIAL_NO);
                            req.input("ref_type_id",sql.Int, 1);
                            req.input("cust_id",sql.VarChar, results.recordset[i].CUST_ID);
                            req.input("loc_id",sql.VarChar, results.recordset[i].LOC_ID);
                            req.input("status_type_id",sql.Int, 1);
                            req.input("notes",sql.VarChar, "");
                            req.input("cstamp", sql.VarChar, `SMURATOV${moment().format("YYYYMMDD")}`);
                            let CreateStatus = await req.execute(
                                "[dbo].[uspUpdateSpecialsStatus]"
                            );                    
                            if (CreateStatus) {
                                console.log(`Dispatch Created for ${results.recordset[i].SPECIAL_NO} : Dispatch Number is ${result2.recordset[0].dispatch_no}`);
                            }
                        }
                    } catch (error) {
                        console.log(error);  
                    }
                }
            }    
        } catch (error) {
            console.log(error);
        }            
    } else {
      mainPool.close();
    }
  } catch (err) {
    console.log(err);  
  }
}

DispatchCreateRun();
