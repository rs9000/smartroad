//Variabili globali
var accYSend = [];
var accY = [];
var latArray = [];
var longArray = [];
var speedArray= [];

var currentPage = "";
var watchID = null;
var recognition;
var myMessages = [];


var uid;
var friendList = [];
var friendList_name = [];

document.addEventListener("app.Ready", onAppReady, false) ;
document.addEventListener("deviceready", onDeviceReady, false);
        
///////////////////////////////////
//App pronta, nascondo splashscreen
///////////////////////////////////
function onAppReady() {
    if( navigator.splashscreen && navigator.splashscreen.hide ) {   // Cordova API detected
        navigator.splashscreen.hide() ;
    }

}


///////////////////////////////////
//Device pronto
///////////////////////////////////
function onDeviceReady() {
    
    // Dati di config per la connessione al servizio Firebae
    var config = {
        apiKey: "AIzaSyBox4ZF0dmYkWFWEMO1itP5Z27-1S0G01U",
        authDomain: "smartroad-1309.firebaseapp.com",
        databaseURL: "https://smartroad-1309.firebaseio.com",
        storageBucket: "smartroad-1309.appspot.com",
      };

    firebase.initializeApp(config);
    
    //Controllo login
    onChange();
   
    //Inizializzo il sintetizzatore vocale
    recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.onresult = function(event) {
        if (event.results.length > 0) {
            var text = event.results[0][0].transcript;
            console.log(text);
            sendNote(text);
        }
    };
    
        
    //Rilevo la posizione
    var options = {maximumAge: 3000, enableHighAccuracy: true };
    watchID = navigator.geolocation.watchPosition(onSuccess, onError, options);
  
}

function rec(){
    recognition.start();
}

////////////////////////////////////////////////
//Funzione che rileva i dati dell'accelerometro
////////////////////////////////////////////////
window.ondevicemotion = function(e) {  
    var accelerationY = e.accelerationIncludingGravity.y;
    accY.push(accelerationY);
}; 
    

/////////////////////////////////////////////////////
//Funzione che rileva una nuova posizione dell'utente
/////////////////////////////////////////////////////
function onSuccess(position) {
    var roadY = roadQuality(); 
    var speed = position.coords.speed;
    var lat1 = position.coords.latitude;
    var lon1 = position.coords.longitude;
    
    if(speed === null){
        speed = 0;
    }

    latArray.push(lat1);
    longArray.push(lon1);
    accYSend.push(roadY.toFixed(3));
    speedArray.push(speed);
    
    if(currentPage == "sub_home"){
        document.getElementById('lat').innerText = "Latitudine: " + lat1 + "°";
        document.getElementById('long').innerText = "Longitudine: " + lon1 + "°";
        document.getElementById('speed').innerText = "Velocità: " + (speed*3.6).toFixed(1) + " km/h";
        document.getElementById('accY').innerText = "Oscillazioni strada: " + roadY.toFixed(3) + " m/s²";
    }

    
    loopMessages();
    
}


//////////////////////////////////////////////////////////////////////
//Funzione che intercetta le eccezioni nel rilevamento della posizione
//////////////////////////////////////////////////////////////////////
function onError(error) {
    console.log('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
}


/////////////////////////////////////////////////////////////////////////////////////
//Funzione che cerca i messaggi nei pressi della posizione dell'utente e li riproduce
/////////////////////////////////////////////////////////////////////////////////////
function loopMessages(){
    
    var allMessages = JSON.parse(localStorage.getItem("messages"));
    
    var lat1 = latArray[latArray.length-1];
    var lon1 = longArray[longArray.length-1];
    
    var categorie = JSON.parse(localStorage.getItem("categorie"));
   
    var black_list= [];
    
    if (localStorage.getItem("black_list") === null) {
         localStorage.setItem("black_list", JSON.stringify(black_list));
    }
    
    black_list = JSON.parse(localStorage.getItem("black_list"));
    
   
     $.each(allMessages, function(i, val) {
         
        if(categorie[allMessages[i].categoria - 1] !== 0){
            
            if($.inArray(allMessages[i].uid, black_list) !== -1){
                console.log("lock");
                return true;
            }
            
            var computeD = distance(allMessages[i].lat,allMessages[i].lng,lat1,lon1);          
            if(computeD < 10){
                    $("#down").unbind();
                    $("#up").unbind();
                    $("#block").unbind();
                
                    $("#homeNote").html(allMessages[i].msg);
                    $("#msg_user").html(allMessages[i].name);
                    $("#down").text(allMessages[i].down);
                    $("#up").text(allMessages[i].up);
                    
                    //Dislike feedback
                    $("#down").bind("click", function(){
                        var upRef = firebase.database().ref('/messages/' + i + '/down');
                        upRef.transaction(function(currentRank) {
                            return currentRank + 1;
                        });
                        console.log(parseInt($("#down").text()));
                        console.log(parseInt($("#down").text()) + 1);
                        $("#down").text(parseInt($("#down").text()) + 1);
                        $("#down").unbind();
                    });
                
                    //Like feedbacks
                    $("#up").bind("click", function(){
                        $("#up").unbind();
                        var upRef = firebase.database().ref('/messages/' + i + '/up');
                        upRef.transaction(function(currentRank) {
                            return currentRank + 1;
                        });
                        $("#up").text(parseInt($("#up").text()) + 1);       
                    });
                
                    //Block User
                    $("#block").bind("click", {uid_block: allMessages[i].uid} , function(event){
                        $("#block").unbind();
                        black_list = JSON.parse(localStorage.getItem("black_list"));
                        black_list.push(event.data.uid_block);
                        localStorage.setItem("black_list", JSON.stringify(black_list));
                  
                    });
                
                    TTS.speak({
                        text: allMessages[i].msg,
                        locale: 'it-IT'
                    }, function () {
                       // Do Something after success
                    }, function (reason) {
                           // Handle the error case
                    });
                             
                    delete allMessages[i];
                    localStorage.setItem("messages", JSON.stringify(allMessages));
                    return false;
            }
        }

     });   
         
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Funzione che stima la qualità della strada in base al valore medio dell'accelerazione perpendicolare all'asfalto
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function roadQuality(){
    var sum = 0;
    var gravity = 9.8;

    //Filtro passa-basso
    for(var i=0;i<accY.length-1;i++){
          if(accY[i] < gravity + 0.2 && accY[i] > gravity - 0.2){
             accY[i] = 0;
          }
          else{
            accY[i] = Math.abs(accY[i] - gravity);
          }
            
    }   
    
    //Media
    for(var j=0; j < accY.length -1; j++ ){
        sum += accY[j]; 
    }

    
    var mean = sum/accY.length;
    accY = [];
    return(mean);
        
}

/////////////////////////////////////////////////////////////////
//Funziona che controlla lo stato di autenticazione dell'utente
/////////////////////////////////////////////////////////////////
function onChange(){
      firebase.auth().onAuthStateChanged(function(user) {
        //Se sono loggato vai alla home altrimenti torna al login
        if (user) {  
             var d = document.querySelector('.mdl-layout');
            d.MaterialLayout.toggleDrawer();
              change_subpage("sub_home");
              uid = user.uid;     
              console.log('Signed in');
              //Scarico i mesaggi
              getAllMessages();
              var userData = JSON.parse(localStorage.getItem("userData"));
              $("#userTxt").text(userData.displayName);
             
             if(userData.photoURL != "undefined" ){
                   $("#drawPic").attr('src', userData.photoURL);
              }
              else{
                    $("#drawPic").attr('src', "img/avatar.png");
              }
       
        }else {
          window.location.replace('login.html');         
          console.log('Sign out');
        }
      
      });
}

///////////////////////////////////////////////////////////////////////////
//Funzione che scarica i messaggi di tutti gli utenti e i dati dell'utente
///////////////////////////////////////////////////////////////////////////
function getAllMessages(){
    
   var categorie = JSON.parse(localStorage.getItem("categorie"));
   var allMessages;
 
    
    firebase.database().ref('/messages/').once('value').then(function(data) {
         allMessages = data.val();
         localStorage.setItem("messages", JSON.stringify(allMessages));
        
         $.each(allMessages,function(i,val){
             if(allMessages[i].uid == uid){
                 myMessages.push(allMessages[i]);
             }
         });
 
     });
    
    
    firebase.database().ref('/users/' + uid + '/').once('value').then(function(data) {
        localStorage.setItem("userData", JSON.stringify(data.val()));
        var userData = JSON.parse(localStorage.getItem("userData"));
  
        if(userData.friends){
            friendList = userData.friends.uid;
            friendList_name = userData.friends.name;
        }
        
        
    });
    
}

///////////////////////////////////////////////////////////////////////
//Funzione che salva un messagio nella posizione geografica dell'utente
////////////////////////////////////////////////////////////////////////
function sendNote(msg1){
    
    var lastLat = latArray[latArray.length -1];
    var lastLong = longArray[longArray.length -1];
    var userData = JSON.parse(localStorage.getItem("userData"));
    var n_categoria = localStorage.getItem("categoria_default");
            
    var postData = {
           uid: uid,
           name: userData.displayName,
           lat:lastLat, 
           lng:lastLong,
           msg:msg1,
           categoria: n_categoria,
           up: 0,
           down: 0
    };
        
      // Get a key for a new Post.
      var newPostKey = firebase.database().ref().child('messages').push().key;

      // Write the new post's data simultaneously in the posts list and the user's post list.
      var updates = {};
      updates['/messages/' + newPostKey] = postData;

      firebase.database().ref().update(updates);
      var snackbarContainer = document.querySelector('#toast'); 
      var txt = {message: 'Invio dati riuscito' };
      snackbarContainer.MaterialSnackbar.showSnackbar(txt);  
    
        TTS.speak({
            text: "Nota salvata con successo.",
            locale: 'it-IT'
        });
    
}

/////////////////////////////////////////////////////////////////
//Funzione che selezione la categoria in cui salvare i mess audio
/////////////////////////////////////////////////////////////////

function setCategory(num){
    
      var cat = ["Punti di interesse","Informazioni commerciali","Sicurezza","Altro"];

      $("#cat_text").text("Pubblica in: " + cat[num-1]);
    
      localStorage.setItem("categoria_default",num);
    
    
       
}


////////////////////////////////////////////////////
//Funzione che invia i dati rilevati dai sensori
////////////////////////////////////////////////////
function postData(){
    
    var jsonLat = JSON.stringify(latArray);
    var jsonLon = JSON.stringify(longArray);
    var jsonAccY = JSON.stringify(accYSend);
    var jsonSpeed = JSON.stringify(speedArray);
    var currentdate = new Date(); 
    var datetime = currentdate.getDate() + "/" + (currentdate.getMonth()+1)  + "/" + currentdate.getFullYear() + " "  + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
    
    // A post entry.
    var myData = {
        lat: latArray,
        lng: longArray,
        speed: speedArray,
        accY: accYSend,
        data: datetime,
        uid: uid
    };

  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('locations').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/locations/' + uid + '/' + newPostKey] = myData;

  firebase.database().ref().update(updates);
  var snackbarContainer = document.querySelector('#toast'); 
  var msg = {message: 'Invio dati riuscito' };
  snackbarContainer.MaterialSnackbar.showSnackbar(msg);  
    
}

//////////////////////////////////////////////////////
//Funzione che calcola la distanza tra due coordinate
//////////////////////////////////////////////////////
function distance(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return (12742 * Math.asin(Math.sqrt(a)))*1000; // 2 * R; R = 6371 km
}


////////////////////////////////////////////////
//Funzione che esegue il logout dell'utente
////////////////////////////////////////////////
function logOut(){
     firebase.auth().signOut();
}


////////////////////////////////////////////////
//Funzione che cambia la pagina corrente
////////////////////////////////////////////////
function change_subpage(pagina){
    currentPage = pagina;
    var d = document.querySelector('.mdl-layout');
    d.MaterialLayout.toggleDrawer();
    
    $("#subpage").load(pagina + ".html", function() {
        
        if(pagina == "sub_friends"){
            getUsers();
            getFriends();
        }
        else if (pagina == "sub_messaggi"){
            myMessage();
            bindSearch();
        }
        else if (pagina == "sub_home"){
            
          var cat = ["Punti di interesse","Informazioni commerciali","Sicurezza","Altro"];
          var num = localStorage.getItem("categoria_default");
            
          if (num === null) {
            localStorage.setItem("categoria_default",4);
            num=4;
          }
            
          $("#cat_text").text("Pubblica in: " + cat[num-1]);
         
            
        }
        else if (pagina == "sub_options"){
            options();
        }
        
    });
    
    
}


///////////////////////////////////////////////////////////////
//Funzione che carica i messaggi lasciati dall'utente corrente
///////////////////////////////////////////////////////////////
function myMessage(){
    
    console.log(myMessages);
    $('#msgList').html('');
    $.each(myMessages, function(i, item) {   
        $('#msgList').append('<div class="myMsg" id="myMsg"><p class="label3" >Latitudine:' + myMessages[i].lat+ '</p><p class="label3">Longitudine:' + myMessages[i].lng + '</p><p class="label3" >Msg: ' + myMessages[i].msg + '</p></div>');
    });
           
   
}


/////////////////////////////////////////////////////////////////////////
//Funzione che filtra i messaggi dal testo inserito nel campo di ricerca
/////////////////////////////////////////////////////////////////////////
function bindSearch(){
       
        var allMessages = JSON.parse(localStorage.getItem("messages"));
    
        $('#search').bind('input', function() {
        $('#msgList').html('');
        $.each(allMessages, function(i, item) {
            if(allMessages[i].uid == uid){
                    if(allMessages[i].msg.indexOf($('#search').val().toLowerCase()) > -1 ){
                         $('#msgList').append('<div class="myMsg" id="myMsg"><p class="label3" >Latitudine:' + allMessages[i].lat+ '</p><p class="label3">Longitudine:' + allMessages[i].lng + '</p><p class="label3" >Msg: ' + allMessages[i].msg + '</p></div>');
                    }
            }
         });    
    });   
}



//////////////////////////////////////////////////////////////
//Opzioni
//////////////////////////////////////////////////////////////

function check_attr(num){
    
    if (localStorage.getItem("categorie") === null) {
         var categorie_new = [0,0,0,0];
         localStorage.setItem("categorie", JSON.stringify(categorie_new));
    }
    
    var categorie = JSON.parse(localStorage.getItem("categorie"));
    if (categorie[num-1] != num){
        categorie[num-1] = num;
    }
    else{
        categorie[num-1] = 0;
    }
    
    localStorage.setItem("categorie", JSON.stringify(categorie));
  
}

function options(){
    
    if (localStorage.getItem("categorie") === null) {
         var categorie_new = [0,0,0,0];
         localStorage.setItem("categorie", JSON.stringify(categorie_new));
    }
    var categorie = JSON.parse(localStorage.getItem("categorie"));
    
    if(categorie[0] !== 0){
        console.log("ok");
        $("list-checkbox-1").prop('checked',true);
    }
    
    
}
