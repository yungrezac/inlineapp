import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, Share, MapPin, CornerDownRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  comments_count: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  } | null;
  liked_by_user: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  liked_by_user: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [replies, setReplies] = useState<{ [key: string]: Reply[] }>({});
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  async function fetchPost() {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url),
          likes(user_id),
          comments:comments(count)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching post:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (!data) {
        setError('Post not found');
        return;
      }

      setPost({
        ...data,
        likes: data.likes?.length || 0,
        comments_count: data.comments?.[0]?.count || 0,
        liked_by_user: data.likes?.some(like => like.user_id === user.id) || false,
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url),
          likes:comment_likes(count),
          replies:comment_replies(count),
          user_likes:comment_likes(user_id)
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const commentsWithCounts = data.map(comment => ({
        ...comment,
        likes_count: comment.likes[0]?.count || 0,
        replies_count: comment.replies[0]?.count || 0,
        liked_by_user: comment.user_likes?.some(like => like.user_id === user.id) || false,
      }));

      setComments(commentsWithCounts);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }

  async function fetchReplies(commentId: string) {
    try {
      const { data, error } = await supabase
        .from('comment_replies')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url)
        `)
        .eq('parent_id', commentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(prev => ({ ...prev, [commentId]: data }));
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  }

  async function handleLike() {
    if (!post) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (post.liked_by_user) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: post.id, user_id: user.id });
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
      }

      setPost({
        ...post,
        likes: post.liked_by_user ? post.likes - 1 : post.likes + 1,
        liked_by_user: !post.liked_by_user,
      });
    } catch (error) {
      console.error('Error handling like:', error);
    }
  }

  async function handleCommentLike(commentId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.liked_by_user) {
        await supabase
          .from('comment_likes')
          .delete()
          .match({ comment_id: commentId, user_id: user.id });
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
      }

      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            likes_count: c.liked_by_user ? c.likes_count - 1 : c.likes_count + 1,
            liked_by_user: !c.liked_by_user,
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error handling comment like:', error);
    }
  }

  async function handleComment() {
    if (!commentText.trim()) return;

    setCommenting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          content: commentText.trim(),
          user_id: user.id,
        });

      if (error) throw error;

      setCommentText('');
      fetchComments();
      
      if (post) {
        setPost({
          ...post,
          comments_count: post.comments_count + 1,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommenting(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || !replyingTo) return;

    setReplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('comment_replies')
        .insert({
          parent_id: replyingTo,
          content: replyText.trim(),
          user_id: user.id,
        });

      if (error) throw error;

      setReplyText('');
      setReplyingTo(null);
      fetchComments();
      fetchReplies(replyingTo);
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setReplying(false);
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) return `${minutes} мин.`;
    if (hours < 24) return `${hours} ч.`;
    if (days < 7) return `${days} дн.`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchPost();
            fetchComments();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Пост не найден</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Пост',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <ArrowLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.postContainer}>
            <TouchableOpacity 
              style={styles.postHeader}
              onPress={() => router.push(`/${post.user_id}`)}
            >
              <Image
                source={{ uri: post.user?.avatar_url || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
              <View style={styles.headerText}>
                <Text style={styles.userName}>{post.user?.full_name || 'Unknown User'}</Text>
                <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.image_url && (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postImage}
              />
            )}

            {(post.latitude && post.longitude) && (
              <View style={styles.locationContainer}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>
                  {post.latitude.toFixed(6)}, {post.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleLike}
              >
                <Heart 
                  size={24} 
                  color={post.liked_by_user ? "#ff4b4b" : "#666"} 
                  fill={post.liked_by_user ? "#ff4b4b" : "none"}
                />
                <Text style={[
                  styles.actionText,
                  post.liked_by_user && styles.actionTextActive
                ]}>
                  {post.likes}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.actionButton}>
                <MessageCircle size={24} color="#666" />
                <Text style={styles.actionText}>{post.comments_count}</Text>
              </View>
              
              <TouchableOpacity style={styles.actionButton}>
                <Share size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Комментарии</Text>
            {comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentWrapper}>
                  <View style={styles.commentContainer}>
                    <TouchableOpacity
                      onPress={() => router.push(`/${comment.user.id}`)}
                    >
                      <Image
                        source={{ uri: comment.user.avatar_url }}
                        style={styles.commentAvatar}
                      />
                    </TouchableOpacity>
                    <View style={styles.commentContent}>
                      <TouchableOpacity
                        onPress={() => router.push(`/${comment.user.id}`)}
                      >
                        <Text style={styles.commentUserName}>{comment.user.full_name}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <View style={styles.commentActions}>
                        <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
                        <TouchableOpacity 
                          style={styles.commentAction}
                          onPress={() => handleCommentLike(comment.id)}
                        >
                          <Heart 
                            size={16} 
                            color={comment.liked_by_user ? "#ff4b4b" : "#8e8e93"} 
                            fill={comment.liked_by_user ? "#ff4b4b" : "none"}
                          />
                          <Text style={[
                            styles.actionText,
                            comment.liked_by_user && styles.actionTextActive
                          ]}>
                            {comment.likes_count}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.commentAction}
                          onPress={() => {
                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                            if (expandedComment !== comment.id) {
                              setExpandedComment(comment.id);
                              fetchReplies(comment.id);
                            }
                          }}
                        >
                          <MessageCircle 
                            size={16} 
                            color={replyingTo === comment.id ? "#007AFF" : "#8e8e93"}
                          />
                          <Text style={[
                            styles.actionText,
                            replyingTo === comment.id && styles.actionTextActive
                          ]}>
                            {comment.replies_count}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {expandedComment === comment.id && replies[comment.id] && (
                        <View style={styles.repliesContainer}>
                          {replies[comment.id].map((reply) => (
                            <View key={reply.id} style={styles.replyContainer}>
                              <TouchableOpacity
                                onPress={() => router.push(`/${reply.user.id}`)}
                              >
                                <Image
                                  source={{ uri: reply.user.avatar_url }}
                                  style={styles.replyAvatar}
                                />
                              </TouchableOpacity>
                              <View style={styles.replyContent}>
                                <TouchableOpacity
                                  onPress={() => router.push(`/${reply.user.id}`)}
                                >
                                  <Text style={styles.replyUserName}>{reply.user.full_name}</Text>
                                </TouchableOpacity>
                                <Text style={styles.replyText}>{reply.content}</Text>
                                <Text style={styles.replyTime}>{getTimeAgo(reply.created_at)}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {replyingTo === comment.id && (
                        <View style={styles.replyInput}>
                          <TextInput
                            style={styles.replyTextInput}
                            placeholder="Написать ответ..."
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            maxLength={500}
                            placeholderTextColor="#8E8E93"
                          />
                          <TouchableOpacity 
                            style={[
                              styles.replyButton,
                              (!replyText.trim() || replying) && styles.replyButtonDisabled
                            ]}
                            onPress={handleReply}
                            disabled={!replyText.trim() || replying}
                          >
                            <CornerDownRight 
                              size={20} 
                              color={replyText.trim() && !replying ? "#007AFF" : "#8E8E93"} 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noCommentsText}>Нет комментариев</Text>
            )}
            
            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <View style={styles.commentInput}>
          <TextInput
            style={styles.commentTextInput}
            placeholder="Добавить комментарий..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            placeholderTextColor="#8E8E93"
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!commentText.trim() || commenting) && styles.sendButtonDisabled
            ]}
            onPress={handleComment}
            disabled={!commentText.trim() || commenting}
          >
            {commenting ? (
              <ActivityIndicator size="small" color="#8E8E93" />
            ) : (
              <Text style={[
                styles.sendButtonText,
                !commentText.trim() && styles.sendButtonTextDisabled
              ]}>
                Отправить
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  postContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  postTime: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1c1c1e',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f2f2f7',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    padding: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#ff4b4b',
  },
  commentsSection: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingTop: 16,
    flex: 1,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  commentWrapper: {
    marginBottom: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  commentUserName: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#1c1c1e',
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
    color: '#1c1c1e',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  commentTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  repliesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  replyContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingLeft: 24,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  replyUserName: {
    fontWeight: '600',
    marginBottom: 2,
    color: '#1c1c1e',
    fontSize: 13,
  },
  replyText: {
    fontSize: 13,
    color: '#1c1c1e',
    lineHeight: 18,
  },
  replyTime: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 4,
  },
  replyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  replyTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 8,
    color: '#1c1c1e',
  },
  replyButton: {
    padding: 8,
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  commentTextInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f2f2f7',
    borderRadius: 20,
    marginRight: 8,
    color: '#1c1c1e',
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  sendButtonDisabled: {
    backgroundColor: '#f2f2f7',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#8e8e93',
  },
  noCommentsText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    padding: 16,
  },
  bottomPadding: {
    height: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});