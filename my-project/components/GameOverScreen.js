import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Final-state screen: this run's stats plus session bests, the top-5 table,
// and a restart button.
const GameOverScreen = ({ score, levelName, bestCombo, bombsHit, sessionBestScore, sessionBestLevelName, isNewHighScore, highScores = [], lifetimeRuns, onRestart }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Game Over!</Text>
            {isNewHighScore && <Text style={styles.newBest}>NEW BEST!</Text>}
            <Text style={styles.line}>Final score: {score}</Text>
            <Text style={styles.line}>Level reached: {levelName}</Text>
            <Text style={styles.line}>Best combo: {bestCombo}</Text>
            <Text style={styles.line}>Bombs hit: {bombsHit}</Text>
            <Text style={styles.line}>Session best score: {sessionBestScore}</Text>
            <Text style={styles.line}>Session best level: {sessionBestLevelName}</Text>
            <View style={styles.table}>
                <Text style={styles.tableTitle}>Top scores</Text>
                {highScores.map((entry, i) => (
                    <Text key={i} style={styles.tableRow}>
                        {i + 1}. {entry.score} pts · {entry.levelName} · combo {entry.combo}
                    </Text>
                ))}
            </View>
            {typeof lifetimeRuns === 'number' && <Text style={styles.line}>Runs played: {lifetimeRuns}</Text>}
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
    newBest: {
        color: '#E65100',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 8,
    },
    table: {
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    tableTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tableRow: {
        marginBottom: 2,
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
