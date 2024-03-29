import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client'

import { RichText } from "prismic-dom"

import { FiUser, FiCalendar, FiClock} from 'react-icons/fi'

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR/index';
import { useUtterances } from './useUtterances';
import ExitPreviewButton from '../../components/ExitPreviewButton';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  uid?: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  nextPost: Post;
  prevPost: Post;
  preview: boolean;
  previewData: any;
}

const Comments = (props) =>{
  useUtterances(props.uid);

  return(
    <div id={props.uid}></div>
  )
}


export default function Post({post, nextPost, prevPost, preview, previewData,  ...props} : PostProps) {
  const router = useRouter();

  function getReadingTimeReduce(content){
    const Regex = /\s+/g

    return content.reduce((acc, contentAtual) =>{
      const headingAmount = contentAtual.heading ? contentAtual.heading?.split(Regex).length : 0;
      const bodyAmount = RichText.asText(contentAtual.body).split(Regex).length;
      return acc + headingAmount + bodyAmount

    }, 0);

  }

  function getReadingTime(){
    const reduceValue = getReadingTimeReduce(post.data.content);
    const readingInMinutes = reduceValue / 200;

    return readingInMinutes < 1 ? '< 1 min' : `${Math.ceil(readingInMinutes)} min`
  }

  const aproxReadingTime = getReadingTime()

  if (router.isFallback) {
    return <div>Carregando...</div>
  }
  return(
    <>
    <Header />
    <main className={styles.postMain}>
      <img src={post.data.banner.url} alt="Post Image" />
      <article>
        <h1>{post.data.title}</h1>
        <div className={styles.postInfos}>
          <div className={styles.infoItem}>
            <FiCalendar />
            <p>{format(new Date(post.first_publication_date),"dd MMM yyyy" ,{locale: ptBR,})}</p>
          </div>
          <div className={styles.infoItem}>
            <FiUser />
            <p>{post.data.author}</p>
          </div>
          <div className={styles.infoItem}>
            <FiClock />
            <p>{aproxReadingTime}</p>
          </div>
        </div>
        {post.last_publication_date ? <p className={styles.updatedAt}>{`* editado em ${format(new Date(post.last_publication_date),"dd MMM yyyy 'às' k:m" ,{locale: ptBR,})}`}</p> : ''}
        
        {post.data.content.map(content =>{
          return(
            <div key={content.heading} className={styles.postContent}>
              <h2>{content.heading}</h2>
              <div dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body)}} />
            </div>
          )
        })}
          <div className={styles.divider} />
          <div className={styles.otherPosts}>
            <div className={styles.otherNames}>
              {prevPost ? <h3>{prevPost.data.title}</h3> : ''}
              {nextPost ? <h3>{nextPost.data.title}</h3> : ''}
            </div>
            <div className={styles.otherLinks}>
              {prevPost ? <Link href={`/post/${prevPost.uid}`}>Post anterior</Link> : ''}
              {nextPost ? <Link href={`/post/${nextPost.uid}`}>Próximo post</Link> : ''} 
            </div>
        </div>
      </article>


        <Comments uid={post.uid} />
    </main>
    {preview ? <ExitPreviewButton /> : ''}
    </>
  )
}

 export const getStaticPaths: GetStaticPaths = async () => {
   const prismic = getPrismicClient();
   const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')], 
    {
      fetch: ['posts.title','posts.subtitle', 'posts.author', 'posts.banner', 'posts.content'], 
      pageSize: 20,
    })
    
   return{
    paths: [{params: {slug: posts.results[0].uid}}, {params: {slug: posts.results[1].uid}},],
    fallback: true
  }
}


 export const getStaticProps : GetStaticProps = async ({preview = false, previewData, params}) => {
  const ref = previewData ? previewData.ref : null;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID("posts", String(params.slug), {ref});

  const post: Post = {
    data: {
      ...response.data,
      content: response.data.content.map(section => ({
        heading: section.heading,
        body: section.body,
      })),
    },
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date
  };

  const prevResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    },
  )
  const nextResponse = await prismic.query(

    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    },
  )

  const nextPost = nextResponse?.results[0] || null
  const prevPost = prevResponse?.results[0] || null


  return { 
    props: { 
      post,
      nextPost,
      prevPost,
      preview,
      previewData
    } 
  }
 }