import React, { useState, useEffect } from 'react';
import Sentiment from 'sentiment';
import ReactWordcloud from 'react-wordcloud';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Jumbotron from 'react-bootstrap/Jumbotron';

import InputForm from './InputForm';
import Spinner from './Spinner';
import logo from './logo.svg';
import './App.scss';
import './scss/customBStheme.scss';

const sentiment = new Sentiment;

const faceScale = [
  {i: -10, name: 'face with symbols on mouth', code: 'U+1F92C'},
  {i: -9, name: 'pouting face', code: 'U+1F621'},
  {i: -8, name: 'anxious face with sweat', code: 'U+1F630'},
  {i: -7, name: 'fearful face', code: 'U+1F628'},
  {i: -6, name: 'anguished face', code: 'U+1F627'},
  {i: -5, name: 'slightly frowning face', code: 'U+1F641'},
  {i: -4, name: 'confused face', code: 'U+1F615'},
  {i: -3, name: 'face with hand over mouth', code: 'U+1F92D'},
  {i: -2, name: 'face without mouth', code: 'U+1F636'},
  {i: -1, name: 'expressionless face', code: 'U+1F611'},
  {i: 0, name: 'neutral face', code: 'U+1F610'},
  {i: 1, name: 'thinking face', code: 'U+1F914'},
  {i: 2, name: 'smirking face', code: 'U+1F60F'},
  {i: 3, name: 'relieved face', code: 'U+1F60C'},
  {i: 4, name: 'slightly smiling face', code: 'U+1F642'},
  {i: 5, name: 'smiling face with smiling eyes', code: 'U+1F60A'},
  {i: 6, name: 'grinning face', code: 'U+1F600'},
  {i: 7, name: 'grinning face with smiling eyes', code: 'U+1F604'},
  {i: 8, name: 'beaming face with smiling eyes', code: 'U+1F601'},
  {i: 9, name: 'smmiling face with hearts', code: 'U+1F970'},
  {i: 10, name: 'star-struck', code: 'U+1F929'},
];

interface CommentChildren {
  kind: string,
  data?: any,
  replies?: {
    data: {
      body: string,
      children: CommentChildren[],
    },
  },
}

const parseComments = (
  data:
    {
      kind: string,
      data: {
        children: CommentChildren[],
      }
    }[],
  depth: number
) => {
  if (!data || data.length < 1) {
    console.error('No comments to parse');
    return 'ERROR: No comments to parse.';
  }
  let result = '';
  if (data && data.length > 1 && data[1].data.children[0]?.data.body) {
    const input = data[1].data.children || null;
    for (let i = 0; i < depth && i < input.length + 1; i++) {
      result = result + '| ' + (input[i]?.data?.body || '');
      for (let j = 0; input[i] && j < depth && j < input[i]?.data?.children?.length + 1; j++) {
        // data.children.data.replies.data.children
        result = result + ' | ' + (input[i].replies?.data?.children[j]?.replies?.data?.body || '');
      }
    }
    return result;
  }
};

let totalCommentString = '';

async function getComments(
  subredditName: string,
  articleId: string,
  depth: number,
  subredditString: string,
  setSubredditString: (resultString: string) => void
) {
  fetch(
    `https://api.reddit.com/r/${subredditName}/comments/${articleId}`
    )
    .then(response => response.json())
    .then(data => {
      const result = parseComments(data, depth);
      // console.log({parsedComment: result});
      totalCommentString = totalCommentString + ' ' + result;
      setSubredditString(subredditString + ' ' + result);
    });
};

async function getSubreddit(
  subredditName: string,
  depth: number,
  subredditString: string,
  setSubredditData: (resultObject: any) => void,
  setSubredditString: (resultString: string) => void,
  setLoadingData: (isLoading: boolean) => void
) {
  let result = '';
  fetch(`https://api.reddit.com/r/${subredditName}/hot/?limit=14`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error(
          `ERROR: ${data.error}\nReason: ${data.reason}\nMessage: ${data.message}`)
        return;
      } else {
        const children = data.data.children;
        console.log({children});
        setSubredditData(children);
        for (let i = 0; i < children.length; i++) {
          const item = children[i];
          getComments(subredditName, item.data.id, depth, subredditString, setSubredditString);
          if (i === depth-1) {
            setTimeout(() => setLoadingData(false), 200);
          }
        }
      }
    });
};

function App() {
  // const [inputText, setInputText] = useState('');
  // const [subredditData, setSubredditData] = useState([] as {data: {selftext: '', title: ''}}[]);
  // const [subredditString, setSubredditString] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [subredditSentiment, setSubredditSentiment] = useState(
    {} as {
      negative: string[],
      positive: string[],
      words: string[],
      score: number,
      comparative: number,
    }
  );
  const [score, setScore] = useState(0);
  const [wordCloudData, setWordCloudData] = useState([] as {text: string, value: number}[]);

  useEffect(() => {
    console.log('subreddit sentiment has changed', subredditSentiment);
    if (!subredditSentiment
      || !subredditSentiment.words
      || subredditSentiment.words.length < 1
    ) {
      console.log('cancel word count');
      return;
    } else {
      const wordCounter: { [key: string]: number; } = {};
      subredditSentiment.words.map((word: string) => {
        if (wordCounter && wordCounter[word + '']) {
          wordCounter[word + ''] += 1;
        } else {
          wordCounter[word + ''] = 1;
        }
      });
      console.log('wordCounter', wordCounter);
      const tempWords = Object.entries(wordCounter);
      console.log({tempWords});
      const words = [] as any[];
      tempWords.map((item: any[]) => {
        console.log('item', item);
        words.push({text: item[0], value: item[1]});
      });
      console.log('words', words)
      setWordCloudData([...words]);
    }
  }, [subredditSentiment])

  return (
    <div className="cover-container d-flex h-100 p-3 mx-auto flex-column">
      <main role="main" className="inner cover">
        <Container fluid>
          {loadingData && <Spinner />}
          {!loadingData && <>
            <Row>
              <Col>
                {subredditSentiment?.words?.length > 0 && (
                  <>
                  <ul className="horizontalLine">
                    {Array.from(new Array(21),(val,index)=> index ).map((item, i) => {
                      const markerFace = faceScale[i];
                      const markerText = markerFace.name;
                      const getFaceCode = (face:any) => parseInt(face.code.replace('U+', ''), 16);
                      const tickValue = item - 10;
                      return (
                        <li className="tickContainer" key={`tick-${tickValue}`}>
                          {tickValue === 10 && <span className="smiley">
                            {String.fromCodePoint(getFaceCode(faceScale[20] as any))}
                          </span>}
                          {tickValue === 5 && <span className="smiley">
                            {String.fromCodePoint(getFaceCode(faceScale[15] as any))}
                          </span>}
                          {tickValue < 1 && tickValue > -1 && (<span className="smiley">
                            {String.fromCodePoint(getFaceCode(faceScale[10] as any))}
                          </span>)}
                          {tickValue === -5 && <span className="smiley">
                            {String.fromCodePoint(getFaceCode(faceScale[5] as any))}
                          </span>}
                          {tickValue === -10 && <span className="smiley">
                            {String.fromCodePoint(getFaceCode(faceScale[0] as any))}
                          </span>}
                          <div
                            className="verticalTick"
                            style={
                              (tickValue === -10 || tickValue === 0 || tickValue === 10)
                              ? {height: "8vw", borderLeft: "4px solid #222", marginTop: "-4vw",}
                              : {}
                            }
                          ></div>
                          {Math.trunc(score*10) === tickValue
                            && (<div
                              className="marker"
                              title={markerText}
                              style={{
                                cursor:'help',
                              }}
                            >
                              {String.fromCodePoint(getFaceCode(markerFace as any))}
                            </div>)}
                          <div className="tickLabel">{tickValue}</div>
                        </li>
                      )
                    })}
                  </ul>
                  </>
                  )}
              </Col>
            </Row>
            <Row>
              <Col>
                <div className="word-cloud">
                  <ReactWordcloud
                    words={wordCloudData}
                    size={[400, 200]}
                    options={{
                      fontSizes: [14, 72],
                      // black, steelblue, coral, orangered, lightsteelblue, silver
                      colors: ['#000', '#36a', '#fa8b60', '#f50', '#98bde2', '#c0c0c0'],
                    }}
                  />
                </div>
              </Col>
            </Row>
          </>}
          <Row>
            <Col>
              <InputForm
                setWordCloudData={setWordCloudData}
                setSubredditSentiment={setSubredditSentiment}
                setScore={setScore}
                loadingData={loadingData}
                setLoadingData={setLoadingData}
              />
            </Col>
            <Col>
              <h1 className="cover-heading">Reddit Happiness Finder</h1>
              <p className="lead">Make your Reddit browsing experience more joyful by taking the temperature of a subreddit before you visit.</p>
            </Col>
          </Row>
          <Row>
            <Col>
              <div style={{display: 'flex', justifyContent: 'space-evenly',}}>
              {/*faceScale.map((face) => {
                const htmlEntity = parseInt('0x000' + face.code.replace('U+', ''), 16);
                return (
                  <div className="smileyContainer">
                  <div className="smiley">
                    {String.fromCodePoint(htmlEntity)}
                  </div>
                  </div>
                );
              })*/}
              </div>
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  );
}

export default App;
