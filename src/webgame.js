//获取html文件中节点并修改一些节点的点击函数
var menuDiv = document.getElementById("backToMenu");
var startDiv = document.getElementById("start");
var introductionDiv = document.getElementById("introduction");
var canvas = document.getElementById("myCanvas");
var audio = document.getElementById("bgMusic");
var notification = document.getElementById("notification");
var difficultyDiv = document.getElementById("difficultyDiv");
var scaleDiv = document.getElementById("scaleDiv");
startDiv.onclick = function()
{
	startGame();
}
menuDiv.onclick = function()
{
	mainMenu();
}
//后门，点击可直接进入boss关卡，位于页面右上角
var bossDiv = document.getElementById("bossStage");
bossDiv.onclick = function()
{
	startGame();
	bossWarning();
}

//全局变量
var canvasWidth = window.innerWidth*0.9;    //画布宽度
var canvasHeight = window.innerHeight*0.9;  //画布高度
var difficulty = 1;                         //难度系数
var enemyNum = 20;                          //红点数量
var bombNum = 5;                            //炸弹数量
var growSpeed;                              //主角生长系数
var speedScale = 1.5;                       //道具加减速倍率，可修改
var scale = 1;                              //主角当前速度倍率
var itemPossibility = 0.008;                //每一帧出现新道具概率，可修改
var timeOfItem = 10000;                     //道具时效，单位为毫秒，可修改
var hero;                                   //主角
var enemy = new Array(enemyNum);            //红点
var boss;                                   //Boss
var bomb = new Array(bombNum);              //炸弹
var accelerateItem;                         //加速道具
var decelerateItem;                         //减速道具
var isThereAccelerateItem = false;          //画面中是否有加速道具
var isThereDecelerateItem = false;          //画面中是否有减速道具
var isBossStage = false;                    //是否已进入boss关卡
var moveLeft = false;                       //主角是否左移
var moveUp = false;                         //主角是否上移
var moveRight = false;                      //主角是否右移
var moveDown = false;                       //主角是否下移
var timeoutID = new Array();                //存储道具timeout的ID的数组
var timeIntervalID;                         //interval的ID
var context = canvas.getContext('2d');      //画布context

//以下函数为创建对象相关
//根据坐标，半径，XY轴速度，颜色创建一个可生长的圆
function myCircle(x, y, r, speedX, speedY, color)
{
	this.x = x;
	this.y = y;
	this.r = r;
	this.speedX = speedX;
	this.speedY = speedY;
	this.color = color;
	//生长函数，参数为另一个圆
	this.grow = function(c){
		scale = this.speedX / (3 + 105 / (this.r + 25));
		this.r = Math.sqrt(this.r * this.r + growSpeed * c.r * c.r);
		this.speedX = scale * (3 + 105 / (this.r + 25));
		this.speedY = scale * (3 + 105 / (this.r + 25));
	}
}
//根据坐标，半径，XY轴速度，颜色创建一个道具
function myItem(x, y, r, speedX, speedY, color)
{
	this.x = x;
	this.y = y;
	this.r = r;
	this.speedX = speedX;
	this.speedY = speedY;
	this.color = color;
}
//根据数组序号新建一个红点
function newEnemy(i)
{
	//随机决定红点大小和速度方向，由此决定红点XY轴速度
	var seed = Math.random();
	var sz = hero.r;
	var p = 0.45 - 0.025 * difficulty;
	if(seed < p)
	{
		sz *= 0.4 + 0.6 * seed / p;
	}
	else
	{
		sz *= 0.3*(seed-p)/(1-p) + 1;
	}
	var speed = 2 + 240 / (sz + 50);
	var degree = Math.random() * 2 * Math.PI;
	var speedX = speed * Math.sin(degree);
	var speedY = speed * Math.cos(degree);
	//由序号决定出现的边界，保证四方向红点数基本均等
	switch(i % 4)
	{
	case 0:
		enemy[i] = new myCircle(-sz, Math.random() * canvas.height, sz,
			Math.abs(speedX), speedY, "red");
		break;
	case 1:
		enemy[i] = new myCircle(Math.random() * canvas.width, -sz, sz,
			speedX, Math.abs(speedY), "red");
		break;
	case 2:
		enemy[i] = new myCircle(canvas.width + sz, Math.random() * canvas.height,
			sz, - Math.abs(speedX), speedY, "red");
		break;
	case 3:
		enemy[i] = new myCircle(Math.random() * canvas.width, canvas.height + sz,
			sz, speedX, - Math.abs(speedY), "red");
		break;
	}
}
//根据颜色创建item，出现边界位置和速度随机
function createItem(r, speedX, speedY, color)
{
	var item;
	switch(parseInt(Math.random() * 4))
	{
	case 0:
		item = new myItem(-r, Math.random() * canvas.height, r, 
			Math.random() * speedX, (Math.random() * 2 - 1) * speedY, color);
		break;
	case 1:
		item = new myItem(Math.random() * canvas.width, -r, r,
			(Math.random() * 2 - 1) * speedX, Math.random() * speedY, color);
		break;
	case 2:
		item = new myItem(canvas.width + r, Math.random() * canvas.height, r,
			- Math.random() * speedX, (Math.random() * 2 - 1) * speedY, color);
		break;
	case 3:
		item = new myItem(Math.random() * canvas.width, canvas.height + r, r,
			(Math.random() * 2 - 1) * speedX, - Math.random() * speedY, color);
		break;
	}
	return item;
}
//根据坐标创建炸弹
function createBomb(x, y)
{
	var degree = Math.random() * 2 * Math.PI / bombNum;
	for (var i = 0; i < bombNum; i++)
	{
		var speedX = 6 * Math.sin(degree);
		var speedY = 6 * Math.cos(degree);
		bomb[i] = new myItem(x, y, 10, speedX, speedY, "black");
		degree += 2 * Math.PI / bombNum;
	}
}

//以下函数为判断相关
//判断圆是否在画布内
function inside(c)
{
	return (c.x >= -c.r) && (c.x <= canvas.width + c.r)
		&& (c.y >= -c.r) && (c.y <= canvas.height + c.r);
}
//判断两个圆是否碰撞
function isCollided(c1, c2)
{
	var distance = Math.sqrt((c1.x - c2.x) * (c1.x - c2.x) + 
		(c1.y - c2.y) * (c1.y - c2.y));
	return (distance <= c1.r + c2.r);
}

//以下函数为道具效果相关
//加速
function accelerate()
{
	hero.speedX *= speedScale;
	hero.speedY *= speedScale;
	scale *= speedScale;
}
//减速
function decelerate()
{
	hero.speedX /= speedScale;
	hero.speedY /= speedScale;
	scale /= speedScale;
}

//以下函数为游戏流程创建对象和调整节点显示相关
//进入开始画面
function mainMenu()
{
	audio.pause();
	if(typeof(timeIntervalID) != "undefined") clearInterval(timeIntervalID);
	//调整节点显示
	difficultyDiv.style.display = "block";
	startDiv.style.display = "block";
	introductionDiv.style.display = "block";
	canvas.style.display = "none";
	menuDiv.style.display = "none";
	scaleDiv.style.display = "none";
	notification.style.display = "none";
	//调整节点内容
	document.getElementById("difficulty").innerHTML = difficulty;
	document.getElementById("diffUp").onclick = function()
	{
		difficulty = (difficulty >= 10) ? 10 : (difficulty + 1);
		document.getElementById("difficulty").innerHTML = difficulty;
	}
	document.getElementById("diffDown").onclick = function()
	{
		difficulty = (difficulty <= 1) ? 1 : (difficulty - 1);
		document.getElementById("difficulty").innerHTML = difficulty;
	}
}
//进入普通关卡
function startGame()
{
	//调整节点显示
	menuDiv.style.display = "block";
	introductionDiv.style.display = "none";
	startDiv.style.display = "none";
	difficultyDiv.style.display = "none";
	canvas.style.display = "block";
	notification.style.display = "none";
	scaleDiv.style.display = "block";
	//调整音乐
	audio.pause();
	audio.loop = true;
	audio.src = "./ext/music/bgm.mp3";
	audio.play();
	//调整参数
	growSpeed = 1.1 - difficulty / 10;
	isBossStage = false;
	enemyNum = difficulty + 14;
	for(var i = 0; i < timeoutID.length; ++i)
	{
		clearTimeout(timeoutID[i]);
	}
	moveLeft = false;
	moveUp = false;
	moveRight = false;
	moveDown = false;
	scale = 1;
	hero = new myCircle(canvasWidth / 2, canvasHeight / 2, 10, 6, 6, "blue");
	canvas.height = canvasHeight;
	canvas.width = canvasWidth;
	//清空画布
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.strokeRect(0, 0, canvas.width, canvas.height);
	//调整对象
	for(var i = 0; i < enemyNum; ++i)
	{
		newEnemy(i);
	}
	if(isThereAccelerateItem)
	{
		delete(accelerateItem);
		isThereAccelerateItem = false;
	}
	if(isThereDecelerateItem)
	{
		delete(decelerateItem);
		isThereDecelerateItem = false;
	}
	//清除道具效果
	if(typeof(timeIntervalID) != "undefined") clearInterval(timeIntervalID);
	timeIntervalID = setInterval(drawCanvas,20);
}
//进入boss关卡
function startBossStage()
{
	//调整参数
	isBossStage = true;
	var speed = parseInt(difficulty / 2) + 1;
	var degree = Math.random() * 2 * Math.PI;
	var speedX = speed * Math.sin(degree);
	var speedY = speed * Math.cos(degree);
	moveLeft = false;
	moveUp = false;
	moveRight = false;
	moveDown = false;
	scale = 1;
	//调整对象
	boss = new myItem(canvas.width / 2, 120, 32 + difficulty * 8,
		speedX, speedY, "#800000");
	hero.x = canvas.width / 2;
	hero.y = canvas.height * 0.7;
	hero.r = 10;
	hero.speedX = 6;
	hero.speedY = 6;
	delete enemy;
	enemyNum = parseInt(difficulty / 2) + 9;
	enemy = new Array(enemyNum);
	for(var i = 0; i < enemyNum; ++i)
	{
		newEnemy(i);
	}
	bombNum = parseInt(difficulty / 2) + 4;
	for(var i = 0; i < bombNum; ++i)
	{
		createBomb(boss.x, boss.y);
	}
	//清除道具效果
	for(var i = 0; i < timeoutID.length; ++i)
	{
		clearTimeout(timeoutID[i]);
	}
}
//出现游戏提示，内容为str，点击执行func函数
function gameNotification(str, func)
{
	notification.innerHTML = str;
	notification.style.display = "block";
	context.clearRect(0, 0, canvas.width, canvas.height);// 清空画布
	if(typeof(timeIntervalID) != "undefined") clearInterval(timeIntervalID);
	notification.onclick = func;
}

//以下函数为对象移动相关
//主角移动
function moveHero()
{
	if(moveLeft) hero.x -= hero.speedX;
	if(moveUp) hero.y -= hero.speedY;
	if(moveRight) hero.x += hero.speedX;
	if(moveDown) hero.y += hero.speedY;
	//超出画布则停在画布边缘
	if(hero.x < hero.r) hero.x = hero.r;
	if(hero.x > canvas.width - hero.r) hero.x = canvas.width - hero.r;
	if(hero.y < hero.r) hero.y = hero.r;
	if(hero.y > canvas.height - hero.r) hero.y = canvas.height - hero.r;
}
//红点移动
function moveEnemy()
{
	for(var i = 0; i < enemyNum; ++i)
	{
		enemy[i].x += enemy[i].speedX;
		enemy[i].y += enemy[i].speedY;
		//移出画面则重新生成
		if(!inside(enemy[i])){
			delete(enemy[i]);
			newEnemy(i);
		}
	}
}
//移动圆c，若超出画面则反弹
function moveInCanvas(c)
{
	c.x += c.speedX;
	c.y += c.speedY;
	if(c.x < c.r) c.speedX *= -1;
	else if(c.x > canvas.width - c.r) c.speedX *= -1;
	if(c.y < c.r) c.speedY *= -1;
	else if(c.y > canvas.height - c.r) c.speedY *= -1;
}
//创建并移动道具
function moveAndCreateItem()
{
	if(isThereAccelerateItem)
	{
		//有加速道具
		accelerateItem.x += accelerateItem.speedX;
		accelerateItem.y += accelerateItem.speedY;
		drawAccelerateItem(accelerateItem);
		if(!inside(accelerateItem))
		{
			delete(accelerateItem);
			isThereAccelerateItem = false;
		}
	}
	else if (Math.random() < itemPossibility)
	{
		//没有加速道具
		accelerateItem = createItem(15, 6, 6, "#8080FF");
		isThereAccelerateItem = true;
	}
	if(isThereDecelerateItem)
	{
		//有减速道具
		decelerateItem.x += decelerateItem.speedX;
		decelerateItem.y += decelerateItem.speedY;
		drawDecelerateItem(decelerateItem);
		if(!inside(decelerateItem))
		{
			delete(decelerateItem);
			isThereDecelerateItem = false;
		}
	}
	else if (Math.random() < itemPossibility)
	{
		//没有减速道具
		decelerateItem = createItem(15, 6, 6, "#000080");
		isThereDecelerateItem = true;
	}
}

//以下为流程逻辑相关
//判断主角与红点是否相撞并对应进行处理
function enemyCollision()
{
	for(var i = 0; i < enemyNum; ++i)
	{
		if(isCollided(hero, enemy[i]))
		{
			if(hero.r > enemy[i].r)
			{
				hero.grow(enemy[i]);
				delete(enemy[i]);
				newEnemy(i);
			}
			else
			{
				gameOver();
				break;
			}
		}
	}
}
//判断主角和道具是否碰撞并对应进行处理
function itemCollision()
{
	if(isThereAccelerateItem && isCollided(hero, accelerateItem))
	{
		//碰到了加速道具
		delete(accelerateItem);
		isThereAccelerateItem = false;
		accelerate();
		timeoutID.push(setTimeout(function(){
			decelerate();
			timeoutID.shift();
		}, timeOfItem));
	}
	if(isThereDecelerateItem && isCollided(hero,decelerateItem))
	{
		//碰到了减速道具
		delete(decelerateItem);
		isThereDecelerateItem = false;
		decelerate();
		timeoutID.push(setTimeout(function(){
			accelerate();
			timeoutID.shift();
		}, timeOfItem));
	}
}
//判断主角是否与boss碰撞并对应进行处理
function bossCollision()
{
	if (isCollided(hero,boss))
	{
		if(hero.r > boss.r)
		{
			hero.grow(boss);
			delete(boss);
			win();
		}
		else
		{
			gameOver();
		}
	}
}
//判断主角是否与炸弹碰撞并对应进行处理
function bombCollision()
{
	for(var i = 0; i < bombNum; ++i)
	{
		if(isCollided(hero, bomb[i]))
		{
			gameOver();
			break;
		}
	}
}

//以下为画面提示相关
//boss关卡预警
function bossWarning()
{
	//调整音效
	audio.pause();
	audio.src = './ext/music/warning.mp3';
	audio.currentTime = 0;
	audio.play();
	//显示提示
	gameNotification("BOSS STAGE!<br />click to continue", function(){
		startBossStage();
		timeIntervalID = setInterval(drawCanvas,20);
		notification.style.display = "none";
	});
}
//通关
function win()
{
	//调整音效
	audio.pause();
	audio.src = './ext/music/win.mp3';
	audio.currentTime = 0;
	audio.loop = false;
	audio.play();
	//显示提示
	gameNotification("CONGRATULATION!<br />You just won!"
		+ "<br />click to retry<br />difficulty: " + difficulty, startGame);
}
//死亡
function gameOver()
{
	delete(hero);
	//调整音效
	audio.pause();
	audio.src = './ext/music/gameover.mp3';
	audio.currentTime = 0;
	audio.play();
	//显示提示
	gameNotification("GAME OVER!<br />click to retry", startGame);
}

//以下为画布绘制相关
//画圆
function drawCircle(c)
{
	context.beginPath();
	context.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
	context.closePath();
	context.fillStyle = c.color;
	context.fill();
}
//画加速道具
function drawAccelerateItem(item)
{
	drawCircle(item);
	context.fillStyle = "white";
	context.fillRect(item.x - 0.8 * item.r, item.y - 0.2 * item.r, 
		1.6 * item.r, 0.4 * item.r);
	context.fillRect(item.x - 0.2 * item.r, item.y - 0.8 * item.r, 
		0.4 * item.r, 1.6 * item.r);
}
//画减速道具
function drawDecelerateItem(item)
{
	drawCircle(item);
	context.fillStyle = "white";
	context.fillRect(item.x - 0.8 * item.r, item.y - 0.2 * item.r, 
		1.6 * item.r, 0.4 * item.r);
}
//画boss
function drawBoss()
{
	drawCircle(boss);
	context.fillStyle = "white";
	context.beginPath();
	context.moveTo(boss.x - 0.6 * boss.r, boss.y - 0.6 * boss.r);
	context.lineTo(boss.x - 0.1 * boss.r, boss.y - 0.3 * boss.r);
	context.lineTo(boss.x - 0.3 * boss.r, boss.y - 0.1 * boss.r);
	context.fill();
	context.beginPath();
	context.moveTo(boss.x + 0.6 * boss.r, boss.y - 0.6 * boss.r);
	context.lineTo(boss.x + 0.1 * boss.r, boss.y - 0.3 * boss.r);
	context.lineTo(boss.x + 0.3 * boss.r, boss.y - 0.1 * boss.r);
	context.fill();
}
//画布绘制
function drawCanvas()
{
	//修改节点内容
	document.getElementById("scale").innerHTML = scale;
	document.getElementById("size").innerHTML = hero.r;
	//清空画布
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.strokeRect(0, 0, canvas.width, canvas.height);
	//普通关移动和绘制对象
	moveHero();
	moveEnemy();
	moveAndCreateItem();
	drawCircle(hero);
	for(var i = 0; i < enemyNum; ++i)
	{
		drawCircle(enemy[i]);
	}
	//boss关移动和绘制对象
	if(isBossStage)
	{
		moveInCanvas(boss);
		for(var i = 0; i < bombNum; ++i)
		{
			moveInCanvas(bomb[i]);
			drawCircle(bomb[i]);
		}
		drawBoss();
		//判断碰撞
		bossCollision();
		bombCollision();
	}
	//boss关卡预警
	if(!isBossStage && hero.r > 0.4*canvas.height)
	{
		bossWarning();
	}
	//判断碰撞
	enemyCollision();
	itemCollision();
}

//键盘响应
window.onload = function(){
	document.onkeydown = function(event){
		switch (event.keyCode)
		{
			case 37:
			moveLeft = true;
			break;
			case 38:
			moveUp = true;
			break;
			case 39:
			moveRight = true;
			break;
			case 40:
			moveDown = true;
			break;
		}
	}
	document.onkeyup = function(event){
		switch (event.keyCode)
		{
			case 37:
			moveLeft = false;
			break;
			case 38:
			moveUp = false;
			break;
			case 39:
			moveRight = false;
			break;
			case 40:
			moveDown = false;
			break;
		}
	}
}

//主函数
mainMenu();