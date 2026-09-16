import React from 'react'
import { StyleSheet, TouchableOpacity, Image } from 'react-native'

// Presentational / controlled: GameBoard owns all timers and state, and
// tells each Square its mole's type ('normal' | 'golden' | 'bomb') or null
// (empty hole) via props.
const accessibilityLabelFor = (moleType, index) => {
    switch (moleType) {
        case 'golden':
            return `Golden mole, hole ${index + 1}`
        case 'bomb':
            return `Bomb, hole ${index + 1}`
        case 'normal':
            return `Mole up, hole ${index + 1}`
        default:
            return `Empty hole ${index + 1}`
    }
}

const colorStyleFor = (moleType) => {
    if (moleType === 'golden') return styles.golden
    if (moleType === 'bomb') return styles.bomb
    return styles.normal
}

const Square = ({ moleType, onWhack, onMiss, index }) => {
    const handlePress = () => {
        if (moleType) {
            onWhack()
        } else {
            onMiss()
        }
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabelFor(moleType, index)}
        >
            <Image
                source={moleType ? require('../assets/mole.png') : require('../assets/hole.png')}
                style={[styles.square, colorStyleFor(moleType)]}
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
        width: '100%',
    },
    normal: {
        backgroundColor: '#9BF89C',
    },
    golden: {
        backgroundColor: '#FFD54F',
        borderWidth: 3,
        borderColor: '#C8A415',
    },
    bomb: {
        backgroundColor: '#E57373',
        borderWidth: 3,
        borderColor: '#B71C1C',
    },
})

export default Square
