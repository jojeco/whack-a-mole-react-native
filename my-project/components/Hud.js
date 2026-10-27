import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const PROGRESS_BAR_WIDTH = 200

// Presentational in-play status bar. Purely driven by props from GameBoard.
const Hud = ({ score, timeLeft, levelName, levelNumber, levelCount, targetScore, streak, multiplier, escaped }) => {
    const targetReached = targetScore > 0 && score >= targetScore
    const fillPct = targetScore > 0 ? Math.min(score / targetScore, 1) * 100 : 0

    return (
        <View style={styles.hud}>
            <Text style={styles.line}>Level {levelNumber}/{levelCount}: {levelName}</Text>
            <Text style={styles.line}>You have {timeLeft} seconds left</Text>
            <Text style={styles.line}>{score} points</Text>
            <Text style={styles.line}>Target: {score}/{targetScore}</Text>
            <View style={styles.progressOuter}>
                <View
                    style={[
                        styles.progressInner,
                        { width: `${fillPct}%`, backgroundColor: targetReached ? '#4caf50' : '#e0a030' },
                    ]}
                />
            </View>
            {targetReached && <Text style={styles.targetReached}>Target reached!</Text>}
            <Text style={styles.line}>Combo: {streak} (x{multiplier})</Text>
            <Text style={styles.line}>Escaped: {escaped}</Text>
            <Text style={styles.line}>Gold = bonus · Red = bomb</Text>
            <Text style={styles.line}>Missing a mole breaks your combo too</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    hud: {
        alignItems: 'center',
        marginBottom: 6,
    },
    line: {
        fontWeight: '600',
    },
    progressOuter: {
        width: PROGRESS_BAR_WIDTH,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ccc',
        overflow: 'hidden',
        marginTop: 2,
        marginBottom: 2,
    },
    progressInner: {
        height: '100%',
        borderRadius: 5,
    },
    targetReached: {
        color: '#4caf50',
        fontWeight: 'bold',
    },
})

export default Hud
