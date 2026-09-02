import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Presentational in-play status bar. Purely driven by props from GameBoard.
const Hud = ({ score, timeLeft, levelName, streak, multiplier }) => {
    return (
        <View style={styles.hud}>
            <Text style={styles.line}>{levelName}</Text>
            <Text style={styles.line}>You have {timeLeft} seconds left</Text>
            <Text style={styles.line}>{score} points</Text>
            <Text style={styles.line}>Combo: {streak} (x{multiplier})</Text>
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
})

export default Hud
