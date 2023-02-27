/* Important */
process.stdin.setEncoding("utf8");
const bodyParser = require("body-parser"); /* To handle post parameters */
const express = require("express");   /* Accessing express module */
const path = require("path");
const app = express();
const morganLogger = require("morgan");
 
/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));
require("dotenv").config({ path: path.resolve(__dirname, '.env') })
app.set("view engine", "ejs");
/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("public"));
const http = require("https");

let teamsName = [];
let allStats;
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME;
const collection= process.env.MONGO_COLLECTION;
const options = {
	method: 'GET',
	headers: {
		'X-RapidAPI-Key': 'e0723bf853mshd8cff6b860d4b1ap15f9eajsn8471017a1f7e',
		'X-RapidAPI-Host': 'laliga-standings.p.rapidapi.com'
	}
};
const db2 = process.env.MONGO_DB_NAME2;
const collection2 = process.env.MONGO_COLLECTION2;
const databaseAndCollection = {db: database, collection:collection};
const databaseAndCollection2 = {db: db2, collection:collection2};

const { MongoClient, ServerApiVersion } = require('mongodb');
const { all } = require("axios");
const { cursorTo } = require("readline");
const uri = `mongodb+srv://${userName}:${password}@cluster0.9zzfolb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

if (process.argv.length != 3 || Number.isNaN(process.argv[2])){
    process.stdout.write(`Usage supermarketServer.js portnumber`);
    process.exit(1);
}
portNumber = process.argv[2];


async function insertTeam(client, databaseAndCollection, newTeam) {
	try {
		await client.connect();
		const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newTeam);
	}catch(e){
		console.error(e)
	}finally{
		await client.close()
	}
	

}
async function listAllMovies(client, databaseAndCollection) {
    try{

		console.log("s")
        await client.connect();
        let filter = {Type: "Team"};
        const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter);

        return result;

    }catch(e){
        console.error(e)
    }
    
}
//index page 
app.get("/", async (request, response) => {


    response.render("IndexPage");
	
})

app.get("/laLiga", async (request, response) => {

	teamsName = []
	//call to api to load laliga standings
	allStats = 	await fetch('https://laliga-standings.p.rapidapi.com/', options)
	.then(response => response.json())
	for (let x in allStats){
		teamsName.push(allStats[x]["team"]);
	}
    response.render("welcomePageLaLiga");
	
})


app.get("/laLiga/addTeams", async (request, response) => {
	let teams = ""
	let address = `http://localhost:${portNumber}/laLiga/teamsData`
	for (let x of teamsName){
		teams += `<option value = "${x.name}"> ${x.name} </option>`
	}
	let variables = {
		teams, address
	}
    response.render("addTeams", variables);
	
})
app.post("/laLiga/teamsData", async (request, response) => {
	let {itemsSelected} = request.body
	let count = 0;
	let unSortedTeams = [];
	for (let x of itemsSelected){
		for (let y in allStats){

			if (x == allStats[y]["team"].name){
				await insertTeam(client, databaseAndCollection, {Type : "Team", Team: allStats[y]});
				count += 1;
			}
		}
	}
	


    response.render("teamsData", {count});
	
})
app.get("/laLiga/displayTeamStats", async (request, response) => {
	let teamsTable = "<table border = 1> <tr><th>Crest </th> <th> Club Name </th>";
	let cursor = await listAllMovies(client, databaseAndCollection);
	let teamsStats = await cursor.toArray();
	teamsStats.sort((x,y) => y.Team.stats.points - x.Team.stats.points);
	let tempStats = teamsStats[0].Team.stats;
	for (let stat in tempStats){
		teamsTable += `<th> ${stat}</th>`
	}
	teamsTable += `</tr>`;

	for (let x of teamsStats){
		let {team: team, stats: stats} = x.Team;
		teamsTable += `<tr><td> <img src = ${team.logo} alt = ${team.name} ;</td>`
		teamsTable += `<td> ${team.name}</td>`
		for (let stat in stats){
			teamsTable += `<td> ${stats[stat]}</td>`
		}
		teamsTable += `</tr>`
		
	}
	teamsTable += "</table>"
    response.render("displayTeamStats", {teamsTable});
	
})

app.get("/laLiga/teamRemove",(request, response) => {
    let address = `http://localhost:${portNumber}/laLiga/processTeamRemove`
    let temp = {address}
    response.render("RemoveAll",temp);
})

app.post("/laLiga/processTeamRemove", async(request, response) => {
    try {
        let filter = {Type: "Team"};

        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany(filter);
        let temp ={count:result.deletedCount}
        response.render("removedPage",temp);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    
})



/* Renders pokemon search page */ 
app.get("/pokemonTeamBuilder", (request, response) => { 
    let url = "http://localhost:" + portNumber.toString() + "/pokemonTeamBuilder/processPickedPokemon";
    const variables = {
        url : url
    };
    response.render("pickPokemon", variables);
});

app.use(bodyParser.urlencoded({extended:false}));

/* Renders confirmed team */
app.post("/pokemonTeamBuilder/processPickedPokemon", (request, response) => {
    let {pokemon1, pokemon2, pokemon3, pokemon4, pokemon5, pokemon6} = request.body;
    const variables = {
        pokemon1 : capitalizeFirst(lowerCaseName(pokemon1)),
        pokemon2 : capitalizeFirst(lowerCaseName(pokemon2)),
        pokemon3 : capitalizeFirst(lowerCaseName(pokemon3)),
        pokemon4 : capitalizeFirst(lowerCaseName(pokemon4)),
        pokemon5 : capitalizeFirst(lowerCaseName(pokemon5)),
        pokemon6 : capitalizeFirst(lowerCaseName(pokemon6))
    }
   
    addTeam(pokemon1, pokemon2, pokemon3, pokemon4, pokemon5, pokemon6);
    response.render("processPickedPokemon", variables);
});

/* Displays page with button to delete all applications */
app.get("/pokemonTeamBuilder/adminRemove", (request, response) => {
    let url = "http://localhost:" + portNumber.toString() + "/pokemonTeamBuilder/processAdminRemove";
    const variables = {
        url : url
    };
    response.render("adminRemove", variables);
});

app.use(bodyParser.urlencoded({extended:false}));

/* Confirmation message that applications were deleted */
app.post("/pokemonTeamBuilder/processAdminRemove", async(request, response) => {
    let numDeleted = await deleteAllPkmnTeams();
    const variables = {
        numTeams : numDeleted
    }
    response.render("processAdminRemove", variables);
});

/* MongoDB related functions */
async function addTeam(pkmn1, pkmn2, pkmn3, pkmn4, pkmn5, pkmn6) {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.9zzfolb.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        /* Inserting the team */
        let team = {Type: "Pokemon", First: pkmn1, Second: pkmn2, Third: pkmn3, Fourth: pkmn4, Fifth: pkmn5, Sixth: pkmn6};
        await addTeamHelper(client, databaseAndCollection2, team);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

/* Physically adds the team's JSON to the MongoDb */
async function addTeamHelper(client, databaseAndCollection, newTeam) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newTeam);
}

/* Removes all Pokemon Teams from MongoDB */
async function deleteAllPkmnTeams() {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.9zzfolb.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        let filter = {Type: "Pokemon"}
        const result = await client.db(databaseAndCollection2.db)
        .collection(databaseAndCollection2.collection)
        .deleteMany(filter);
        let count = result.deletedCount;
        return count;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


/* Miscellaneous functions */
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function lowerCaseName(string) {
    return string.toLowerCase();
}







app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
prompt = "Enter stop to shutdown: "
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let dataInput = process.stdin.read();
    if(dataInput !== null){
        let command = dataInput.trim();
        if (command === "stop"){
            process.stdout.write("Shutting down the server");
            process.exit(0);
        }else {
            console.log(`Invalid command: ${command}`);
            process.stdout.write(prompt);
            process.stdin.resume();
        }
    }
});