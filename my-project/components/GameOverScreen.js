import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Final-state screen: this run's stats plus session bests, and a restart button.
const GameOverScreen = ({ score, levelName, bestCombo, sessionBestScore, sessionBestLevelName, onRestart }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Game Over!</Text>
            <Text style={styles.line}>Final score: {score}</Text>
            <Text style={styles.line}>Level reached: {levelName}</Text>
            <Text style={styles.line}>Best combo: {bestCombo}</Text>
            <Text style={styles.line}>Session best score: {sessionBestScore}</Text>
            <Text style={styles.line}>Session best level: {sessionBestLevelName}</Text>
            <TouchableOpacity style={styles.button} onPress={onRestart} accessibilityRole="button" accessibilityLabel="Play Again">
                <Text style={styles.buttonText}>Play Again</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 20,
        marginBottom: 12,
    },
    line: {
        marginBottom: 4,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 8,
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
})

export default GameOverScreen
