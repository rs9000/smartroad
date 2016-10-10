document.addEventListener("app.Ready", onAppReady, false) ;
document.addEventListener("deviceready", onDeviceReady, false);

var isNewUser = false;


function onAppReady() {
    if( navigator.splashscreen && navigator.splashscreen.hide ) {   // Cordova API detected
        navigator.splashscreen.hide() ;
    }

    goLogin();
    onChange();

}

//////////////////////////////////////////////////////////////
//Funzione che inizializza il servizio di Firebase
//////////////////////////////////////////////////////////////

function onDeviceReady() {
  var config = {
        apiKey: "AIzaSyBox4ZF0dmYkWFWEMO1itP5Z27-1S0G01U",
        authDomain: "smartroad-1309.firebaseapp.com",
        databaseURL: "https://smartroad-1309.firebaseio.com",
        storageBucket: "smartroad-1309.appspot.com",
    };

    firebase.initializeApp(config);
}

//////////////////////////////////////////////////////////////
//Mostra la pagina registrazione
//////////////////////////////////////////////////////////////

function goRegister(){
     $("#v_login").hide();
     $("#v_register").show();
}

//////////////////////////////////////////////////////////////
//Mostra la pagina di login
//////////////////////////////////////////////////////////////

function goLogin(){
     $("#v_register").hide();
     $("#v_login").show();
}

//////////////////////////////////////////////////////////////
//Funzione che viene lanciata quando l'utente passa dallo stato disconnesso a loggato
//////////////////////////////////////////////////////////////

function onChange(){

    firebase.auth().onAuthStateChanged(function(user) {
        if (user && isNewUser) {
            var myData = {
                      displayName: $('#r_name').val(),
                      email: user.email,
                      emailVerified: user.emailVerified,
                      photoURL: 'undefined',
                      isAnonymous: user.isAnonymous,
                      refreshToken: user.refreshToken,
                      providerData: user.providerData
            };
            // Write the new post's data simultaneously in the posts list and the user's post list.
            var updates = {};
            updates['/users/' + user.uid] = myData;
            firebase.database().ref().update(updates);
        }
        else if(user){
           window.location.replace('index.html');
        }else {
            // User is signed out.
            // [START_EXCLUDE silent]
            console.log('Sign out');
            // [END_EXCLUDE]
        }
        // [START_EXCLUDE silent]

        // [END_EXCLUDE]
      });


}

//////////////////////////////////////////////////////////////
//Funzione per effettuare il login
//////////////////////////////////////////////////////////////

 function login() {
      if (firebase.auth().currentUser) {
        // [START signout]
        firebase.auth().signOut();
        // [END signout]
      } else {
        var email = $.trim($('#l_username').val().toLowerCase());
        var password = $('#l_userpass').val();
        if (email.length < 4) {
          alert('Please enter an email address.');
          return;
        }
        if (password.length < 4) {
          alert('Please enter a password.');
          return;
        }
        // Sign in with email and pass.
        // [START authwithemail]
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // [START_EXCLUDE]
          alert(errorCode);
          if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
          } else {
            console.error(error);
          }
          // [END_EXCLUDE]
        });
          console.log("ok");
        // [END authwithemail]
      }

    }

//////////////////////////////////////////////////////////////
//Funzione per effettuare la registrazione
//////////////////////////////////////////////////////////////

  function register() {
      var email = $('#r_username').val();
      var password = $('#r_userpass').val();
      if (email.length < 4) {
        alert('Please enter an email address.');
        return;
      }
      if (password.length < 4) {
        alert('Please enter a password.');
        return;
      }
      // Sign in with email and pass.
      // [START createwithemail]
      isNewUser = true;

      firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // [START_EXCLUDE]
        if (errorCode == 'auth/weak-password') {
          alert('The password is too weak.');
        } else {
          console.error(error);
        }

        console.log("signUp ok");
      });
  }




