const express = require('express');
const mysql = require('mysql');
const app = express();
const cors = require('cors');
const bodyparser = require('body-parser');
const multer = require('multer')
const upload = multer({dest: 'images/originalImg/'})
const fs = require('fs');
const moment = require('moment');
const exec = require('child_process').exec;
const uuidAPIKey = require('uuid-apikey');


const imageRoute = 'images/';

const pool = mysql.createPool({
	connectionLimit : 10,
	host     : 'localhost',
	user     : 'root',
	password : 'dfd16011056',
	database : 'mydb'
});

require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

const key ={
	apikey: '3F1MYFZ-HWKMSBR-QQ5KZPB-F3ZQ92X',
	uuid: '1bc34f3f-8f27-4caf-bdcb-3fd978ff748b'
};

const server = app.listen(3001,() => {
	//console.log('Start Server : localhost:3001!');
	console.log('nodejsdone');
});

app.use(express.json());

app.use(express.urlencoded({
	extended: true
}))
app.use(cors());
app.use(bodyparser.json());

app.get('/api/users/:type/:apikey', async (req, res) =>{
	let{
		type,apikey
	} = req.params;
	if (!uuidAPIKey.isAPIKey(apikey) || !uuidAPIKey.check(apikey, key.uuid)) {
		res.send('API KEY가 유효하지 않습니다.');
		console.log('Do not match API Key');
	}
	else{
		pool.getConnection(function(err, connection) {
			var tp;  
			if (err) throw err; // not connected!
			connection.query('SELECT User_idx FROM User_list where User_email = ?',type,function (error,result, fields){

				if(result.length == 0){
					console.log("No match user");
					res.send(result);
				}
				else{//result.length == 1
					tp = result[0].User_idx;	
					console.log(tp);

					connection.query('SELECT * FROM Search_list where User_idx = ?',tp, function (error, results, fields) {
						// When done with the connection, release it.
						res.send(JSON.stringify(results));
						console.log('results',results);

						// Handle error after the release.
						if (error) throw error;
						// Don't use the connection here, it has been returned to the pool.
					});
				}
				connection.release();
			});
		});
	}
});

app.get('/api/images/:type/:apikey',async (req,res) =>{
	let{
		type,apikey
	} = req.params;

	if (!uuidAPIKey.isAPIKey(apikey) || !uuidAPIKey.check(apikey, key.uuid)) {
		res.send('API KEY가 유효하지 않습니다.');
		console.log('Do not match API Key');
	}
	else{
		var file = imageRoute + type;

		console.log(__dirname+'/images/examinedImg/'+type+ ".jpeg");
		fs.exists(__dirname+'/images/examinedImg/'+type+ ".jpeg", function (exists){
			if(exists)
			{
				fs.readFile(__dirname+'/images/examinedImg/'+type + ".jpeg", function(err,data){
					res.end(data);
				});
			}
			else
			{
				res.end('file is not exists');
			}
		});
	}
});

app.post('/api/users/:type/post/:type2/:apikey',upload.single('image'), async(req, res) =>{
	let{
		type,type2,apikey
	} = req.params;
	if (!uuidAPIKey.isAPIKey(apikey) || !uuidAPIKey.check(apikey, key.uuid)) {
		res.send('API KEY가 유효하지 않습니다.');
		console.log('Do not match API Key');
	}
	else{

		var date = moment().format('YYYY_MM_DD_HH:mm:ss');
		var pyRoute = "../yolov5/detect.py";

		var fileName = date + "_" + type;//with no jpeg

		console.log("File : ",req.file);
		console.log(moment().format('YYYY-MM-DD_HH:mm:ss'));
		fs.rename(imageRoute +"originalImg/"+ req.file.filename , imageRoute + "originalImg/"  + date + "_" + type + ".jpeg",function(err){
			if(err)
				console.log("Rename Filename Error : ",err);
			console.log("FileName Changed");
			console.log(imageRoute + date + "_" + type + "jpeg");
		});
		//검사 진행 함수
		var plane_Code = -1;
		var examineFile = imageRoute + "originalImg/" + date + "_" + type + ".jpeg";

		switch(type2)
		{
			case "pep":
				plant_Code = 0;
				break;
			case "cab":
				plant_Code = 1;
				break;
			case "bean":
				plant_Code = 2;
				break;
			case "wel":
				plant_Code = 4;
				break;
			case "rad":
				plant_Code = 3;
				break;
			default:
				console.log("No plant type registered");
				break;
		}

		var commd = "python3 ../yolov5/client.py ../nods/" + examineFile + " " + plant_Code;
	

		console.log("Examine...");
		console.log(commd);
		exec(commd, (err,out,stderr) => {//child process 생성
			if(err)
				console.log("Examine Error : ",err);
			var output_S = "../yolov5/" + out;
			var output_Img = output_S + "/" + date + "_" + type + ".jpeg";
			var output_Img_Dest = imageRoute + "examinedImg/" + fileName + ".jpeg";
			var output_Txt = output_S + "/" + date + "_" + type + ".txt";
			var output_Txt_Dest = imageRoute + "examinedTxt/" + fileName + ".txt";

			console.log(output_S);
			console.log("Successfully Examined!");

			fs.rename(output_Img,output_Img_Dest,function(err){//txt파일 이동
				if(err)
					console.log("Rename Filename Error1 : ",err);
				console.log("Successfully Stored in images/examinedImg");
			});

			fs.rename(output_Txt,output_Txt_Dest,function(err){//image파일 이동
				if(err)
					console.log("Rename Filename Error1 : ",err);
				console.log("Successfully Stored in images/examinedTxt");
			});


			pool.getConnection(function(err, connection) {//DB접근
				if(err)
				{
					console.log("Insertation Error",err);
				}

				connection.query('SELECT User_idx FROM User_list where User_email = ?',type,function (error,result, fields){//Search if ID  exist
					if(error)
						console.log("Search Error1",error);
					if(result.length == 0)//add user
					{
						connection.query('INSERT INTO User_list(User_email) VALUES(?)',type,function(error2, result1,field){//if not exist, add User
							if(error2)
								console.log("Insert Error1",error2);
							console.log("User_list Insert Success");
							console.log(result1);
						});
					}
					connection.query('SELECT User_idx FROM User_list where User_email = ?',type,function (error,result, fields){//Search to Insert data
						if(error)
							console.log("Search Error2",error);
						console.log(result);
						connection.query('SELECT MAX(Search_idx) AS MAX_SearchIDX FROM Search_list WHERE User_idx = ?',result[0].User_idx,function(error3, result2, field){//find new search index
							if(error3)
								console.log("Search Error3",error3);

							let textArr;
							let text;
							try{
								text = fs.readFileSync("images/examinedTxt/" + fileName + ".txt");
								textArr = text.toString().split(' ');
							}
							catch(e)
							{
								console.log("This is not plant, the txtFile does not come out");
								textArr = [-1,0,0,0,0,-1];
							}

							var ill = parseInt(textArr[0]);
							var percent = (parseFloat(textArr[5])*100).toFixed(1);;
							var illString;
							console.log("병 코드 : " + ill + ", 정확도 : ", percent);
							if(type2 == "pep"){
								switch(ill)
								{
									case 0:
										illString = "정상";
										break;
									case 1:
										illString = "고추탄저병";
										break;
									case 2:
										illString = "고추흰가루병";
										break;
									default:
										illString = "검사불가";
										break;
								}
							}
							else if(type2 == "cab")
							{
								switch(ill)
								{
									case 0:
										illString = "정상";
										break;
									case 1:
										illString = "배추검은썩음병";
										break;
									case 2: 
										illString = "배추노균병";
										break;
									default:
										illString = "검사불가";
										break;

								}
							}
							else if(type2 == "bean")
							{
								switch(ill)
								{
									case 0:
										illString = "정상";
										break;
									case 1:
										illString = "콩불마름병";
										break;
									case 2: 
										illString = "콩점무늬병";
										break;
									default:
										illString = "검사불가";
										break;

								}
							}
							else if(type2 == "wel")
							{
								switch(ill)
								{
									case 0:
										illString = "정상";
										break;
									case 1:
										illString = "파노균병";
										break;
									case 2:
										illString = "파검은무늬병";
										break;
									case 3:
										illString = "파녹병";
										break;
									default:
										illString = "검사불가";
										break;

								}
							}
							else if(type2 == "rad")
							{
								switch(ill)
								{
									case 0:
										illString = "정상";
										break;
									case 1:
										illString = "무노균병";
										break;
									case 2:
										illString = "무검은무늬병";
										break;
									default:
										illString = "검사불가";
										break;

								}
							}

							var par;
							par = [result[0].User_idx, result2[0].MAX_SearchIDX + 1,fileName,type2,illString,percent,date];//UserIndex, lastSearchIndex+1, Filename,plantType, illName,percent, date
							if(ill != -1){
								connection.query('INSERT INTO Search_list(User_idx, Search_idx, Plant_img, Plant_type, Pest, Percentage, Created_time) VALUES(?,?,?,?,?,?,?)', par, function(error4,result3,field){
									if(error4)
										console.log("Insert Error2",error4);
									console.log("Search_list Insert Success");
									console.log(result3);
									res.send(fileName +" " + illString +" " + percent);
								});
							}
							else
							{
								res.send(fileName +" " + illString +" " + percent);
								fs.unlinkSync(imageRoute + fileName + ".jpeg");
							}
						});
					});

				});
				// When done with the connection, release it.
				connection.release();

				// Handle error after the release.

			});
			fs.exists(__dirname+'/images/examinedImg/' + fileName + ".jpeg", function (exists){
				if(exists)
				{
					console.log("File Successfully Stored in examinedImg");
				}
				else
				{
					console.log("File is not exist in examinedImg");
				}
			});


		});
	}
	// Don't use the connection here, it has been returned to the pool.
});

app.delete('/api/users/:type/delete/:type2/:apikey', async(req,res)=>{
	let{
		type,type2,apikey//emailID, searchID
	} = req.params;
	if (!uuidAPIKey.isAPIKey(apikey) || !uuidAPIKey.check(apikey, key.uuid)) {
		res.send('API KEY가 유효하지 않습니다.');
		console.log('Do not match API Key');
	}
	else{
		pool.getConnection(function(err, connection) {
			if(err)
			{
				console.log("delete Error",err);
			}
			connection.query('SELECT User_idx FROM User_list WHERE User_email = ?',type,function(error,result,fields){
				if(error)
					console.log("Search Error1",error);
				if(result.length == 0)
				{
					console.log('No match User');
					res.send('No Match User');
				}
				var tp;
				tp = result[0].User_idx;
				var par;
				par = [tp,type2];
				//사진 파일 삭제
				connection.query('SELECT Plant_img AS FileName FROM Search_list WHERE User_idx = ? AND Search_idx = ?',par, function(error1, result1, fields){
					if(error1)
						console.log("SELECT Error1",error1);

					var filePath = imageRoute + "originalImg/" +result1[0].FileName + ".jpeg";
					try{
						fs.unlinkSync(filePath);
						fs.unlinkSync(imageRoute + "examinedImg/" + result1[0].FileName + ".jpeg");
						fs.unlinkSync(imageRoute + "examinedTxt/" + result1[0].FileName + ".txt");
						console.log("Successfully Deleted",filePath);
					}catch(err){
						console.log("Delete file Error",err);
					}
				});
				connection.query('DELETE FROM Search_list WHERE User_idx = ? AND Search_idx = ?', par, function(error2, result2, fields){
					if(error2)
						console.log("DELETE Error2",error2);
					console.log(result2);
					res.send(result2);
				});
			});
			connection.release();
		});
	}
});

app.delete('/api/users/:type/deleteAll/:apikey', async(req,res)=>{
	let {
		type,apikey
	} = req.params;
	if (!uuidAPIKey.isAPIKey(apikey) || !uuidAPIKey.check(apikey, key.uuid)) {
		res.send('API KEY가 유효하지 않습니다.');
		console.log('Do not match API Key');
	}
	else{
		pool.getConnection(function(err, connection) {
			if(err)
			{
				console.log("deleteAll Error",err);
			}
			connection.query('SELECT User_idx FROM User_list WHERE User_email = ?',type,function(error,result,fields){
				if(error)
					console.log("Search Error1",error);
				if(result.length == 0)
				{
					console.log('No match User');
					res.send('No Match User');
				}
				var tp;
				tp = result[0].User_idx;
				//사진 파일 삭제
				connection.query('SELECT Plant_img AS FileName FROM Search_list WHERE User_idx = ?',tp, function(error1, result1, fields){
					if(error1)
						console.log("SELECT Error1",error1);
					for(var i=0; i<result1.length; i++){
						var filePath = imageRoute + "originalImg/" +result1[i].FileName + ".jpeg";
						try{
							fs.unlinkSync(filePath);
							fs.unlinkSync(imageRoute + "examinedImg/" + result1[i].FileName + ".jpeg");
							fs.unlinkSync(imageRoute + "examinedTxt/" + result1[i].FileName + ".txt");
							console.log("Successfully Deleted",filePath);
							console.log(i);
						}catch(err){
							console.log("Delete file Error",err);
						}
					}
				});
				connection.query('DELETE FROM Search_list WHERE User_idx = ?', tp, function(error2, result2, fields){
					if(error2)
						console.log("DELETE Error2",error2);
					console.log(result2);
					res.send(result2);
				});
			});
			connection.release();
		});
	}
});
