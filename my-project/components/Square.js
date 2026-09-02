import React from 'react'
import { StyleSheet, TouchableOpacity, Image } from 'react-native'

// Presentational / controlled: GameBoard owns all timers and state, and
// tells each Square whether its mole is active via props.
const Square = ({ active, onWhack, onMiss, index }) => {
    const handlePress = () => {
        if (active) {
            onWhack()
        } else {
            onMiss()
        }
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={active ? `Mole up, hole ${index + 1}` : `Empty hole ${index + 1}`}
        >
            <Image
                source={active ? require('../assets/mole.png') : require('../assets/hole.png')}
                style={active ? styles.mole : styles.square}
            />
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    square: {
        flex: 1,
        minWidth: 80,
        minHeight: 80,
        margin: 10,
        backgroundColor: '#9BF89C',
        width: '100%'
    },
    mole: {
        flex: 1,
        minWidth: 80,
        minHeight: 80,
        margin: 10,
        backgroundColor: '#9BF89C',
        width: '100%'
    },
})

export default Square
