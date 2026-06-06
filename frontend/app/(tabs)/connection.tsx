import AppLogo from '@/components/AppLogo';
import FavModal from '@/components/FavModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getCache } from '@/utils/fetchData';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

// Firebase Auth tools import
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
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
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState(null);

  const [isFavModalOpen, setIsFavModalOpen] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Sets user object if logged in, or null if logged out
    });

    // Unsubscribe from listener on unmount
    return () => unsubscribe();
  }, []);

  //  Single unified function for both login and registration
  const handleEmailAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!isRegistering) {
        console.log('Step 1: Attempting Email login...');
        // Try to sign in
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userResult = result.user;
        console.log('User logged in successfully:', userResult.email);

        // Update the user's last login timestamp in Firestore
        const userRef = doc(db, 'users', userResult.uid);
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      } else {
        console.log('Step 2: Creating new account...');
        // Check if passwords match
        if (password !== confirmPassword) {
          setErrorMessage(translateWord('passwordsDoNotMatch'));
          return;
        }
        try {
          const registerResult = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = registerResult.user;
          console.log('Account automatically created:', newUser.email);

          // Fetch local storage data to sync with the new account
          const favoriteTeams = getCache<string[]>('favoriteTeams') || [];
          const leaguesSelected = getCache<string[]>('leaguesSelected') || [];
          const showScores = getCache<boolean>('showScores') ?? false;
          const showPreviousScores = getCache<boolean>('showPreviousScores') ?? false;
          const gameSelected = getCache<any[]>('gameSelected') || [];
          const teamsSelectedRaw = getCache<any[]>('teamsSelected') || [];
          const startDate = localStorage.getItem('startDate');
          const endDate = localStorage.getItem('endDate');
          const teamSelected = localStorage.getItem('teamSelected');
          const leagueSelected = localStorage.getItem('leagueSelected');
          const teamsSelected = teamsSelectedRaw.map((t) => t.uniqueId).filter(Boolean);

          const userRef = doc(db, 'users', newUser.uid);
          await setDoc(
            userRef,
            {
              uid: newUser.uid,
              name: email.split('@')[0],
              email: newUser.email,
              photoURL: null,
              lastLogin: serverTimestamp(),
              favoriteTeams,
              leaguesSelected,
              showScores,
              showPreviousScores,
              gameSelected,
              teamsSelected,
              startDate,
              endDate,
              teamSelected,
              leagueSelected,
            },
            { merge: true },
          );
        } catch (err: unknown) {
          const registerError = err as { code?: string; message?: string };
          if (registerError.code === 'auth/email-already-in-use') {
            setErrorMessage(translateWord('emailAlreadyInUse'));
          } else {
            setErrorMessage(translateWord('authError') + (registerError.message ?? ''));
          }
        }
      }
    } catch (err: unknown) {
      const loginError = err as { code?: string; message?: string };
      console.log('Login failed:', loginError.code);
      // Fine-tuned connection error handling
      if (loginError.code === 'auth/user-not-found') {
        setErrorMessage(translateWord('userNotFound'));
      } else if (loginError.code === 'auth/wrong-password') {
        setErrorMessage(translateWord('incorrectPassword'));
      } else if (loginError.code === 'auth/invalid-credential') {
        // Recommended generic security message (prevents email enumeration)
        setErrorMessage(translateWord('invalidCredentials'));
      } else {
        setErrorMessage(translateWord('loginError') + (loginError.message || ''));
      }
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!email) {
      setErrorMessage(translateWord('enterEmailFirst'));
      return;
    }

    try {
      console.log('Attempting to send password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(translateWord('passwordResetSent'));
    } catch (error: unknown) {
      console.error('Error during password reset request:', error);
      setErrorMessage(translateWord('resetError'));
    }
  };

  // Function to log in with Google
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const provider = new GoogleAuthProvider();
    try {
      console.log('Attempting Google login...');
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      console.log('User logged in successfully:', loggedUser.displayName, loggedUser.email);

      // Store or update basic user profile info in Firestore
      // We no longer push local guest preferences here.
      // The onAuthStateChanged hook will pull existing DB data and overwrite local storage.
      const userRef = doc(db, 'users', loggedUser.uid);
      await setDoc(
        userRef,
        {
          uid: loggedUser.uid,
          name: loggedUser.displayName || loggedUser.email?.split('@')[0],
          email: loggedUser.email,
          photoURL: loggedUser.photoURL,
          lastLogin: serverTimestamp(),
        },
        { merge: true },
      );

      console.log('User data successfully synced with Firestore');
    } catch (error: unknown) {
      console.error('Error during Google login:', error);
      setErrorMessage(translateWord('connectionError'));
    }
  };

  // Function to log out
  const handleGoogleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
    } catch (error: unknown) {
      console.error('Error during logout:', error);
    }
  };

  // Function to permanently delete the user account and data
  const handleDeleteAccount = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setErrorMessage(translateWord('noUserLoggedIn'));
      return;
    }

    const confirmDeletion = window.confirm(translateWord('confirmDeleteAccount'));

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

      setSuccessMessage(translateWord('accountDeleted'));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Error during account deletion:', error);

      if (error.code === 'auth/requires-recent-login') {
        setErrorMessage(translateWord('recentLoginRequired'));
      } else {
        setErrorMessage(translateWord('deletionError'));
      }
    }
  };

  // Function to toggle mode and clear confirm password
  const toggleAuthMode = () => {
    const newMode = !isRegistering;
    setIsRegistering(newMode);
    setErrorMessage('');
    setSuccessMessage('');
    // Clear confirm password if switching back to login
    if (!newMode) setConfirmPassword('');
  };

  // Function to open preferences modal
  const handleOpenFavModal = () => {
    const cached = getCache<string[]>('favoriteTeams');
    setFavoriteTeams(cached || []);
    setIsFavModalOpen(true);
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

        {/* Conditional Rendering block based on connection status */}
        {!user ? (
          // IF DISCONNECTED: Show inputs and login options
          <View style={styles.innerContent}>
            {/* Form fields for Email & Password */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder={translateWord('emailPlaceholder')}
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={translateWord('passwordPlaceholder')}
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              {isRegistering && (
                <TextInput
                  style={styles.input}
                  placeholder={translateWord('passwordConfirmPlaceholder')}
                  placeholderTextColor="#888"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}

              {/* Link to request a password reset */}
              {!isRegistering && (
                <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
                  <ThemedText style={styles.forgotPasswordText}>{translateWord('forgotPassword')}</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Elegant error display */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Icon name="exclamation-circle" type="font-awesome" size={16} color="#DB4437" />
                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
              </View>
            ) : null}

            {/* Elegant success display (for password reset) */}
            {successMessage ? (
              <View style={styles.successContainer}>
                <Icon name="check-circle" type="font-awesome" size={16} color="#0F9D58" />
                <ThemedText style={styles.successText}>{successMessage}</ThemedText>
              </View>
            ) : null}

            {/* Only one unified email button now */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.emailButton,
                (!email || !password || (isRegistering && !confirmPassword)) && styles.disabledButton,
              ]}
              onPress={handleEmailAuth}
              disabled={!email || !password || (isRegistering && !confirmPassword)}
            >
              <Icon name="envelope" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>
                {isRegistering ? translateWord('signUp') : translateWord('signIn')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleContainer} onPress={toggleAuthMode}>
              <ThemedText style={styles.toggleText}>
                {isRegistering ? translateWord('alreadyHaveAccount') : translateWord('noAccount')}{' '}
                <span style={styles.linkText}>{isRegistering ? translateWord('signIn') : translateWord('signUp')}</span>
              </ThemedText>
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

            {/* Elegant error display */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Icon name="exclamation-circle" type="font-awesome" size={16} color="#DB4437" />
                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
              </View>
            ) : null}

            {/* Elegant success display */}
            {successMessage ? (
              <View style={styles.successContainer}>
                <Icon name="check-circle" type="font-awesome" size={16} color="#0F9D58" />
                <ThemedText style={styles.successText}>{successMessage}</ThemedText>
              </View>
            ) : null}

            <br />

            {/* Change Preferences Button */}
            <TouchableOpacity style={[styles.button, styles.prefButton]} onPress={handleOpenFavModal}>
              <Icon name="cog" type="font-awesome" size={20} color="#fff" style={styles.iconStyle} />
              <ThemedText style={styles.buttonText}>{translateWord('changePreferences')}</ThemedText>
            </TouchableOpacity>

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
              <ThemedText style={styles.buttonText}>{translateWord('deleteAccount')}</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FavModal
        isOpen={isFavModalOpen}
        favoriteTeams={favoriteTeams}
        onClose={() => setIsFavModalOpen(false)}
        onSave={(teams) => {
          setFavoriteTeams(teams);
        }}
      />
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
  prefButton: {
    backgroundColor: '#5856D6', // A purple color for preferences
  },
  toggleContainer: {
    marginTop: 15,
    padding: 10,
  },
  toggleText: {
    fontSize: 14,
    textAlign: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBE9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    width: 280,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFC8C5',
  },
  errorText: {
    color: '#DB4437',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    width: 280,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CEEAD6',
  },
  successText: {
    color: '#0F9D58',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
});
