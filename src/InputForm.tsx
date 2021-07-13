import React, { useState, useEffect } from 'react';
import Sentiment from 'sentiment';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const sentiment = new Sentiment;

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

function InputForm(props: {
    setWordCloudData: (wordData: {text: string, value: number}[]) => void,
    setSubredditSentiment: (sentimentResult: {
      negative: string[],
      positive: string[],
      words: string[],
      score: number,
      comparative: number,
    }) => void,
    setScore: (score: number) => void,
    loadingData: boolean,
    setLoadingData: (value: boolean) => void,
}) {
  const {setWordCloudData, setSubredditSentiment, setScore, loadingData, setLoadingData} = props;

  // const [loadingData, setLoadingData] = useState(false);
  const [inputText, setInputText] = useState('');
  const [subredditData, setSubredditData] = useState([] as {data: {selftext: '', title: ''}}[]);
  const [subredditString, setSubredditString] = useState('');

  useEffect(() => {
    setTimeout(() => {
      if (subredditData?.length > 0) {
      let string = subredditData.map((item) => (
        item.data.title + ' ' + item.data.selftext
      )).join(' ');
      string = string + ' ' + totalCommentString;
      const result = sentiment.analyze(string);
      console.log({stringToAnalyze: string});
      setSubredditSentiment(result);
      console.log({sentiment: result});
      const good = result.positive.length;
      const bad = result.negative.length;
      const total = good + bad;
      console.log('good', good, 'bad', bad, 'total', total);
      setScore((good-bad)/total);
    }}, 250);
  }, [subredditData]);

    return (
        <Form>
            <Form.Group controlId="getSubredditData" className="form-floating">
                <Form.Label>Subreddit name</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="subreddit name"
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                />
                <Form.Text className="text-muted">
                    Only enter the subreddit name, not the preceeding "r/"
                </Form.Text>
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              onClick={(event) => {
                event.preventDefault();
                if (!inputText) {
                  return;
                }
                setLoadingData(true);
                setSubredditString('');
                setSubredditData([{data: {selftext: '', title: ''}}]);
                totalCommentString = '';
                // return only the hottest 15 posts from a subreddit
                getSubreddit(inputText, 5, subredditString, setSubredditData, setSubredditString, setLoadingData);
              }}
            >
              Submit
            </Button>
        </Form>
    );
}

export default InputForm;
