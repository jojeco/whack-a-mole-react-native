import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity } from 'react-native'
import Square from './Square.js'
import { connect } from 'react-redux'
import { resetScore } from './../redux'

const GameBoard = (props) => {
  const [timeLeft, setTimeLeft] = useState(60)
  const [round, setRound] = useState(0)

  useEffect(() => {
    if(!timeLeft) return
    const timerId = setInterval(() => {
      //happens every 1000ms
      setTimeLeft(timeLeft -1)
    },1000)
    return () => clearInterval(timerId)
  }, [timeLeft])

  const playAgain = () => {
    props.resetScore()
    setTimeLeft(60)
    setRound(round + 1)
  }

    return (
        <ImageBackground
        style={styles.container}
        source={require('../assets/background.png')}
        >
        <Text style={styles.header}>Ania's Whack-a-mole App!</Text>
        {timeLeft === 0 ? (
          <View style={styles.gameOver}>
            <Text>Game Over! You whacked {props.score} moles</Text>
            <TouchableOpacity style={styles.playAgainButton} onPress={playAgain}>
              <Text>Play Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text>You have {timeLeft} seconds left</Text>
            <Text>{props.score} Moles whacked!</Text>
            <View style={styles.game} key={round}>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
              <Square></Square>
            </View>
          </>
        )}
      </ImageBackground>
    )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
    },
    game: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 300,
      paddingTop: 20,
    },
    header: {
      fontWeight: 'bold',
      marginBottom: 10,
      marginTop: 100
    },
    gameOver: {
      alignItems: 'center',
      paddingTop: 20,
    },
    playAgainButton: {
      marginTop: 20,
      padding: 10,
      backgroundColor: '#9BF89C',
    }
  });

  const mapStateToProps = state => {
    return {
      score: state.score
    }
  }

  const mapDispatchToProps = dispatch => {
    return {
      resetScore: () => dispatch(resetScore())
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(GameBoard)
