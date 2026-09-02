import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Idle-state screen: title, start button, best-score-this-session, blurb.
const StartScreen = ({ onStart, bestScore }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ready to whack some moles?</Text>
            <Text style={styles.blurb}>
                Moles pop up in the holes below — tap them before they duck back
                down. Clear each level's target score before time runs out to
                advance to a faster, harder level. Chain whacks together without
                missing to build a combo multiplier for bonus points.
            </Text>
            <Text style={styles.best}>Best score this session: {bestScore}</Text>
            <TouchableOpacity style={styles.button} onPress={onStart} accessibilityRole="button" accessibilityLabel="Start Game">
                <Text style={styles.buttonText}>Start Game</Text>
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
        marginBottom: 20,
        fontWeight: '600',
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
})

export default StartScreen
