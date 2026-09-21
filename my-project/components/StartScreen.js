import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Idle-state screen: title, start button, best score, top-5 table, lifetime
// stats, blurb, and a small reset-saved-progress control.
const StartScreen = ({ onStart, bestScore, highScores = [], lifetime, hydrated, onResetProgress }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ready to whack some moles?</Text>
            <Text style={styles.blurb}>
                Moles pop up in the holes below — tap them before they duck back
                down. Clear each level's target score before time runs out to
                advance to a faster, harder level. Chain whacks together without
                missing to build a combo multiplier for bonus points. Watch for
                gold moles for a big bonus, and don't whack the red bombs —
                they cost you points and break your combo.
            </Text>
            <Text style={styles.best}>Best score: {bestScore}</Text>
            {!hydrated && <Text style={styles.muted}>Loading saved progress…</Text>}
            <View style={styles.table}>
                <Text style={styles.tableTitle}>Top scores</Text>
                {highScores.length === 0 ? (
                    <Text style={styles.muted}>No high scores yet — play a round!</Text>
                ) : (
                    highScores.map((entry, i) => (
                        <Text key={i} style={styles.tableRow}>
                            {i + 1}. {entry.score} pts · {entry.levelName} · combo {entry.combo}
                        </Text>
                    ))
                )}
            </View>
            {lifetime && (
                <Text style={styles.lifetime}>
                    {lifetime.runs} runs played · {lifetime.molesWhacked} moles whacked · {lifetime.bombsHit} bombs hit
                </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={onStart} accessibilityRole="button" accessibilityLabel="Start Game">
                <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.resetButton, !hydrated && styles.resetButtonDisabled]}
                onPress={onResetProgress}
                disabled={!hydrated}
                accessibilityRole="button"
                accessibilityLabel="Reset saved progress"
            >
                <Text style={styles.resetText}>Reset progress</Text>
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
        textAlign: 'center',
    },
    blurb: {
        textAlign: 'center',
        marginBottom: 16,
    },
    best: {
        marginBottom: 8,
        fontWeight: '600',
    },
    muted: {
        color: '#666',
        marginBottom: 8,
    },
    table: {
        alignItems: 'center',
        marginBottom: 8,
    },
    tableTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tableRow: {
        marginBottom: 2,
    },
    lifetime: {
        color: '#444',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resetButton: {
        marginTop: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    resetButtonDisabled: {
        opacity: 0.4,
    },
    resetText: {
        color: '#888',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
})

export default StartScreen
