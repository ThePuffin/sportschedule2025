import AppLogo from '@/components/AppLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react'; // ADDED: useEffect hook
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

// Firebase Auth tools import
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider, // ADDED: Reset password method
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// Firestore database tools import
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

// Import both auth AND db from your config file
import { auth, db } from '../../utils/firebaseConfig';

export default function ConnectionScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ADDED: State to store the active user session
  const [user, setUser] = useState(null);

  // ADDED: Listen to auth state changes dynamically when the screen mounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Sets user object if logged in, or null if logged out
    });

    // Unsubscribe from listener on unmount
    return () => unsubscribe();
  }, []);

  //  Single unified function for both login and registration
  const handleEmailAuth = async () => {
    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      console.log('Step 1: Attempting Email login...');
      // Try to sign in first
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userResult = result.user;
      console.log('User logged in successfully:', userResult.email);

      // Update the user's last login timestamp in Firestore
      const userRef = doc(db, 'users', userResult.uid);
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });

      alert(`Welcome back!`);
    } catch (loginError) {
      console.log('Login failed, checking if account creation is needed...', loginError.code);

      // Firebase throws 'auth/invalid-credential' or 'auth/user-not-found' if the account doesn't exist
      if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/user-not-found') {
        try {
          console.log('Step 2: Account not found or credentials mismatch. Trying to register...');
          const registerResult = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = registerResult.user;
          console.log('Account automatically created:', newUser.email);

          // Create new user document inside Firestore
          const userRef = doc(db, 'users', newUser.uid);
          await setDoc(
            userRef,
            {
              uid: newUser.uid,
              name: email.split('@')[0], // Generate default name from email prefix
              email: newUser.email,
              photoURL: null,
              lastLogin: serverTimestamp(),
            },
            { merge: true },
          );

          alert('Account successfully created!');
        } catch (registerError) {
          console.error('Registration failed:', registerError.code);

          // If registration fails because the email is already taken,
          // it means the initial login failed due to a WRONG PASSWORD.
          if (registerError.code === 'auth/email-already-in-use') {
            alert('Incorrect password for this account. Please try again.');
          } else {
            alert('Authentication error: ' + registerError.message);
          }
        }
      } else {
        // Handle other standard login errors (e.g., invalid-email)
        alert('Login error: ' + loginError.message);
      }
    }
  };

  // ADDED: Function to handle password reset emails
  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address in the field above first.');
      return;
    }

    try {
      console.log('Attempting to send password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      alert('A password reset link has been sent to your email inbox!');
    } catch (error) {
      console.error('Error during password reset request:', error);
      alert('Reset error: ' + error.message);
    }
  };

  // Function to log in with Google
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log('Attempting Google login...');
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      console.log('User logged in successfully:', loggedUser.displayName, loggedUser.email);

      // Store or update user profile in Firestore
      const userRef = doc(db, 'users', loggedUser.uid);
      await setDoc(
        userRef,
        {
          uid: loggedUser.uid,
          name: loggedUser.displayName,
          email: loggedUser.email,
          photoURL: loggedUser.photoURL,
          lastLogin: serverTimestamp(),
        },
        { merge: true },
      );

      console.log('User data successfully synced with Firestore');
      alert(`Welcome ${loggedUser.displayName}!`);
    } catch (error) {
      console.error('Error during Google login:', error);
      alert('Connection error: ' + error.message);
    }
  };

  // Function to log out
  const handleGoogleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
      alert('You have been logged out.');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Function to permanently delete the user account and data
  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert('No user currently logged in.');
      return;
    }

    const confirmDeletion = window.confirm(
      'Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.',
    );

    if (!confirmDeletion) return;

    try {
      console.log('Starting account deletion process...');

      // 1. Delete user document from Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userRef);
      console.log('User document successfully deleted from Firestore');

      // 2. Delete user from Firebase Authentication
      await deleteUser(currentUser);
      console.log('User authentication account permanently deleted');

      alert('Your account has been successfully deleted.');
    } catch (error) {
      console.error('Error during account deletion:', error);

      if (error.code === 'auth/requires-recent-login') {
        alert('For security reasons, please log out and log back in before deleting your account.');
      } else {
        alert('Deletion error: ' + error.message);
      }
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 15px 5px 15px',
        }}
      >
        <AppLogo />
      </div>
      <View style={styles.content}>
        <ThemedText>
          <h3>{!user ? translateWord('authentication') : translateWord('loggedInAs')}</h3>
        </ThemedText>

        {/* MODIFIED: Conditional Rendering block based on connection status */}
        {!user ? (
          // IF DISCONNECTED: Show inputs and login options
          <View style={styles.innerContent}>
            {/* Form fields for Email & Password */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* ADDED: Link to request a password reset */}
              <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
                <ThemedText style={styles.forgotPasswordText}>{translateWord('forgotPassword')}</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Only one unified email button now */}
            <TouchableOpacity style={[styles.button, styles.emailButton]} onPress={handleEmailAuth}>
              <Icon name="envelope" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>{translateWord('continueWithEmail')}</ThemedText>
            </TouchableOpacity>

            <br />
            {/* A visual divider line between Email and Google options */}
            <View style={styles.separator} />
            <br />

            {/* Google Login Button */}
            <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleLogin}>
              <Icon name="google" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>{translateWord('signInWithGoogle')}</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          // IF CONNECTED: Show current account info and management tools
          <View style={styles.innerContent}>
            <ThemedText style={styles.welcomeText}>
              <span style={styles.emailHighlight}>{user.email}</span>
            </ThemedText>

            <br />

            {/* Sign Out Button */}
            <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={handleGoogleLogout}>
              <Icon name="sign-out" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>{translateWord('signOut')}</ThemedText>
            </TouchableOpacity>

            <br />

            {/* Delete Account Button */}
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteAccount}>
              <Icon name="trash" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>Delete Account</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // ADDED: UI Layout centering alignment container
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: 280,
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
    width: '100%',
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  // ADDED: Styling alignment for Forgot password link
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 5,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
    width: 280,
  },
  emailButton: {
    backgroundColor: '#007AFF', // iOS blue color
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  disconnectButton: {
    backgroundColor: '#DB4437',
  },
  deleteButton: {
    backgroundColor: '#222222',
  },
  iconStyle: {
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // ADDED: Profile session status text styling
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  separator: {
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    width: 280,
  },
});
